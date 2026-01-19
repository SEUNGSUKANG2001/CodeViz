"""
Repository analyzer that:
1. Clones the GitHub repository
2. Analyzes git history for impactful commits
3. Builds symbol maps for multiple languages
4. Resolves dependencies between files
5. Returns graph data plus history snapshots
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional


def clone_repository(repo_url: str, ref: Optional[str], target_dir: str) -> bool:
    """Clone a git repository to the target directory."""
    try:
        # Full history is needed for historical snapshots.
        subprocess.run(
            ["git", "clone", repo_url, target_dir],
            check=True,
            capture_output=True,
            timeout=300,
        )

        if ref:
            subprocess.run(
                ["git", "checkout", ref],
                cwd=target_dir,
                check=True,
                capture_output=True,
                timeout=60,
            )

        return True
    except Exception as e:
        print(f"[Analyzer] Clone failed: {e}")
        return False


def get_impactful_commits(repo_path: Path) -> list[dict[str, Any]]:
    """Pick impactful commits by insertions+deletions and include HEAD."""
    cmd = ["git", "log", "--pretty=format:%H|%cd", "--shortstat"]
    result = subprocess.run(
        cmd,
        cwd=repo_path,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )

    commits: list[dict[str, Any]] = []
    current_commit: Optional[dict[str, Any]] = None

    lines = result.stdout.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if "|" in line:
            parts = line.split("|", 1)
            current_commit = {"hash": parts[0], "date": parts[1], "impact": 0}
            i += 1

            if i < len(lines) and lines[i].strip() == "":
                i += 1
            if i < len(lines) and "changed" in lines[i]:
                stat = lines[i]
                insertions = 0
                deletions = 0
                ins_match = re.search(r"(\d+) insertion", stat)
                del_match = re.search(r"(\d+) deletion", stat)
                if ins_match:
                    insertions = int(ins_match.group(1))
                if del_match:
                    deletions = int(del_match.group(1))
                current_commit["impact"] = insertions + deletions

            commits.append(current_commit)
        i += 1

    if not commits:
        return []

    sorted_by_impact = sorted(commits, key=lambda x: x["impact"], reverse=True)
    top_commits = sorted_by_impact[:9]
    head_commit = commits[0]

    if head_commit not in top_commits:
        if top_commits:
            top_commits.pop()
        top_commits.append(head_commit)

    indices = {c["hash"]: i for i, c in enumerate(commits)}
    top_commits.sort(key=lambda x: indices[x["hash"]], reverse=True)

    return top_commits


def build_symbol_map(repo_path: Path) -> dict[str, str]:
    """Index symbols to file paths for dependency resolution."""
    symbol_map: dict[str, str] = {}

    for path in repo_path.rglob("*"):
        if path.is_dir() or ".git" in path.parts:
            continue

        rel_path = path.relative_to(repo_path).as_posix()
        ext = path.suffix
        stem = path.stem
        filename = path.name

        try:
            content = path.read_text(errors="ignore", encoding="utf-8")
        except Exception:
            continue

        if ext in [".kt", ".java"]:
            pkg_match = re.search(r"^\s*package\s+([\w\.]+)", content, re.MULTILINE)
            if pkg_match:
                package_name = pkg_match.group(1)
                full_class_name = f"{package_name}.{stem}"
                symbol_map[full_class_name] = rel_path

        elif ext == ".py":
            if stem == "__init__":
                module_name = rel_path.replace("/", ".").replace(".__init__.py", "")
            else:
                module_name = rel_path.replace("/", ".").replace(".py", "")
            symbol_map[module_name] = rel_path

        elif ext == ".xml" and "layout" in path.parts:
            resource_name = f"@layout/{stem}"
            symbol_map[resource_name] = rel_path

        elif ext in [".h", ".hpp", ".c", ".cpp", ".cc"]:
            symbol_map[filename] = rel_path

        elif ext in [".js", ".jsx", ".ts", ".tsx", ".vue"]:
            symbol_map[rel_path] = rel_path
            no_ext_path = os.path.splitext(rel_path)[0]
            symbol_map[no_ext_path] = rel_path
            if stem == "index":
                folder_path = os.path.dirname(rel_path)
                symbol_map[folder_path] = rel_path

        elif ext == ".json":
            symbol_map[rel_path] = rel_path

    return symbol_map


def get_dependencies(file_path: Path, symbol_map: dict[str, str], repo_root: Path) -> list[dict[str, str]]:
    """Extract dependencies for a single file based on its language."""
    deps: list[dict[str, str]] = []
    ext = file_path.suffix

    try:
        content = file_path.read_text(errors="ignore", encoding="utf-8")
    except Exception:
        return []

    if ext in [".kt", ".java"]:
        imports = re.findall(r"^\s*import\s+([\w\.]+)", content, re.MULTILINE)
        for imp in imports:
            if imp in symbol_map:
                deps.append({"target": symbol_map[imp], "type": "file_dependency"})

    elif ext == ".py":
        py_imports = re.findall(r"^(?:from\s+([\w\.]+)\s+import|import\s+([\w\.]+))", content, re.MULTILINE)
        for match in py_imports:
            target = match[0] if match[0] else match[1]
            if target in symbol_map:
                deps.append({"target": symbol_map[target], "type": "file_dependency"})

    elif ext == ".xml":
        layout_refs = re.findall(r"@layout/([\w_]+)", content)
        for layout in layout_refs:
            key = f"@layout/{layout}"
            if key in symbol_map:
                deps.append({"target": symbol_map[key], "type": "layout_include"})
        class_refs = re.findall(r"<\s*([\w\.]+)", content)
        for cls in class_refs:
            if "." in cls and cls in symbol_map:
                deps.append({"target": symbol_map[cls], "type": "class_reference"})

    elif ext in [".gradle", ".kts"]:
        includes = re.findall(r"include\s*\(?[\"']:(.+?)[\"']\)?", content)
        for inc in includes:
            module_dir = inc.replace(":", "/")
            possible_targets = [
                f"{module_dir}/build.gradle",
                f"{module_dir}/build.gradle.kts",
            ]
            for pt in possible_targets:
                if (repo_root / pt).exists():
                    rel_target = str(Path(pt)).replace("\\", "/")
                    deps.append({"target": rel_target, "type": "module_include"})
                    break

    elif ext in [".c", ".cpp", ".h", ".hpp", ".cc"]:
        includes = re.findall(r"#include\s*[\"<](.+?)[\">]", content)
        for inc in includes:
            filename = os.path.basename(inc)
            if filename in symbol_map:
                deps.append({"target": symbol_map[filename], "type": "include"})

    elif ext in [".js", ".jsx", ".ts", ".tsx", ".vue"]:
        js_imports = re.findall(r"(?:from|require\s*\()\s*[\"']([\./@][^\"']+)[\"']", content)
        current_dir = os.path.dirname(file_path.relative_to(repo_root).as_posix())

        def resolve_js_target(path_hint: str) -> Optional[str]:
            if path_hint in symbol_map:
                return symbol_map[path_hint]

            for prefix in ("src/", "app/", "apps/web/src/"):
                candidate = f"{prefix}{path_hint}"
                if candidate in symbol_map:
                    return symbol_map[candidate]

            suffix = f"/{path_hint}"
            for key, value in symbol_map.items():
                if "/" in key and key.endswith(suffix):
                    return value

            return None

        for imp_path in js_imports:
            resolved_path = ""
            if imp_path.startswith("@/"):
                resolved_path = imp_path[2:]
            else:
                if current_dir == ".":
                    resolved_path = os.path.normpath(imp_path).replace("\\", "/")
                else:
                    resolved_path = os.path.normpath(f"{current_dir}/{imp_path}").replace("\\", "/")

            if not resolved_path:
                continue

            target = resolve_js_target(resolved_path)
            if target:
                deps.append({"target": target, "type": "import"})

    return deps


def analyze_current_tree(repo_path: Path) -> dict[str, dict[str, Any]]:
    symbol_map = build_symbol_map(repo_path)
    result_files: dict[str, dict[str, Any]] = {}

    supported_exts = {
        ".kt": "kotlin",
        ".java": "java",
        ".py": "python",
        ".xml": "xml",
        ".gradle": "gradle",
        ".kts": "gradle",
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".vue": "vue",
        ".c": "c",
        ".cpp": "cpp",
        ".h": "c",
        ".hpp": "cpp",
        ".cc": "cpp",
        ".json": "json",
    }

    for path in repo_path.rglob("*"):
        if path.is_dir() or ".git" in path.parts:
            continue

        rel_path = path.relative_to(repo_path).as_posix()
        dependencies = get_dependencies(path, symbol_map, repo_path)

        if path.suffix in supported_exts:
            lang = supported_exts[path.suffix]
            if path.suffix == ".kts" and "gradle" not in path.name:
                lang = "kotlin"

            try:
                line_count = len(path.read_text(errors="ignore").splitlines())
            except Exception:
                line_count = 0

            result_files[rel_path] = {
                "language": lang,
                "line_count": line_count,
                "depends_on": dependencies,
            }

    return result_files


def build_graph_from_files(file_data: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    languages = defaultdict(int)

    for file_path, info in file_data.items():
        languages[info.get("language", "") or "unknown"] += 1
        nodes.append({
            "id": file_path,
            "name": os.path.basename(file_path),
            "path": file_path,
            "type": "file",
            "lines": info.get("line_count", 0),
            "language": info.get("language", ""),
        })

    edge_keys: set[tuple[str, str, str]] = set()
    for source_path, info in file_data.items():
        for dep in info.get("depends_on", []):
            target = dep.get("target")
            if not target or target not in file_data:
                continue
            edge_type = dep.get("type", "import")
            key = (source_path, target, edge_type)
            if key in edge_keys:
                continue
            edge_keys.add(key)
            edges.append({
                "source": source_path,
                "target": target,
                "type": edge_type,
            })

    total_lines = sum(info.get("line_count", 0) for info in file_data.values())
    stats = {
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "fileCount": len(nodes),
        "directoryCount": 0,
        "totalLines": total_lines,
        "languages": dict(languages),
    }

    return nodes, edges, stats


def get_git_history(repo_dir: Path, max_commits: int = 20) -> list[dict[str, Any]]:
    history: list[dict[str, Any]] = []

    try:
        result = subprocess.run(
            ["git", "log", f"-{max_commits}", "--pretty=format:%H|%s|%an|%at", "--name-status"],
            cwd=repo_dir,
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            return history

        current_commit: Optional[dict[str, Any]] = None
        for line in result.stdout.strip().split("\n"):
            if "|" in line and line.count("|") >= 3:
                parts = line.split("|", 3)
                current_commit = {
                    "hash": parts[0],
                    "message": parts[1],
                    "author": parts[2],
                    "timestamp": int(parts[3]) if parts[3].isdigit() else 0,
                    "files": [],
                }
                history.append(current_commit)
            elif current_commit and line.strip():
                parts = line.split("\t")
                if len(parts) >= 2:
                    status = parts[0][0] if parts[0] else "M"
                    file_path = parts[-1]
                    current_commit["files"].append({"path": file_path, "status": status})

    except Exception as e:
        print(f"[Analyzer] Git history error: {e}")

    return history


def analyze_repository(repo_url: str, ref: Optional[str] = None) -> dict[str, Any]:
    """Analyze a repository and return graph data and history snapshots."""
    temp_dir = tempfile.mkdtemp(prefix="codeviz_")
    repo_path = Path(temp_dir)

    try:
        print(f"[Analyzer] Cloning {repo_url}...")
        if not clone_repository(repo_url, ref, temp_dir):
            raise Exception("Failed to clone repository")

        target_commits = get_impactful_commits(repo_path)
        history_snapshots: list[dict[str, Any]] = []

        if target_commits:
            print(f"[Analyzer] Analyzing {len(target_commits)} snapshots...")

        for commit in target_commits:
            subprocess.run(
                ["git", "checkout", "-f", commit["hash"]],
                cwd=repo_path,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            file_data = analyze_current_tree(repo_path)
            history_snapshots.append({
                "hash": commit["hash"],
                "date": commit["date"],
                "impact": commit["impact"],
                "files": file_data,
            })

        if history_snapshots:
            latest_files = history_snapshots[-1]["files"]
        else:
            latest_files = analyze_current_tree(repo_path)

        nodes, edges, stats = build_graph_from_files(latest_files)
        history = get_git_history(repo_path)

        print(f"[Analyzer] Analysis complete: {stats}")

        return {
            "metadata": {
                "repoUrl": repo_url,
                "ref": ref or "main",
                "analyzedAt": None,
                "version": "2.1.0",
            },
            "nodes": nodes,
            "edges": edges,
            "history": history,
            "stats": stats,
            "snapshots": history_snapshots,
        }

    finally:
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass
