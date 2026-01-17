import hashlib
import random
from typing import Any


def generate_mock_graph(repo_url: str, ref: str | None = None) -> dict[str, Any]:
    """
    Generate a mock graph.json structure.
    In a real implementation, this would analyze the repository.
    """
    # Use repo URL to generate deterministic but unique graph
    seed = int(hashlib.md5(f"{repo_url}:{ref or 'main'}".encode()).hexdigest()[:8], 16)
    random.seed(seed)

    # Generate mock directories
    directories = [
        {"id": "root", "name": "/", "type": "directory", "parent": None},
        {"id": "src", "name": "src", "type": "directory", "parent": "root"},
        {"id": "lib", "name": "lib", "type": "directory", "parent": "src"},
        {"id": "components", "name": "components", "type": "directory", "parent": "src"},
        {"id": "utils", "name": "utils", "type": "directory", "parent": "src"},
        {"id": "tests", "name": "tests", "type": "directory", "parent": "root"},
    ]

    # Generate mock files
    files = [
        {"id": "index", "name": "index.ts", "type": "file", "parent": "src", "lines": random.randint(50, 200)},
        {"id": "app", "name": "app.ts", "type": "file", "parent": "src", "lines": random.randint(100, 500)},
        {"id": "config", "name": "config.ts", "type": "file", "parent": "lib", "lines": random.randint(30, 100)},
        {"id": "db", "name": "db.ts", "type": "file", "parent": "lib", "lines": random.randint(100, 300)},
        {"id": "button", "name": "Button.tsx", "type": "file", "parent": "components", "lines": random.randint(50, 150)},
        {"id": "modal", "name": "Modal.tsx", "type": "file", "parent": "components", "lines": random.randint(80, 200)},
        {"id": "helpers", "name": "helpers.ts", "type": "file", "parent": "utils", "lines": random.randint(100, 400)},
        {"id": "format", "name": "format.ts", "type": "file", "parent": "utils", "lines": random.randint(50, 150)},
        {"id": "test_app", "name": "app.test.ts", "type": "file", "parent": "tests", "lines": random.randint(100, 300)},
        {"id": "test_utils", "name": "utils.test.ts", "type": "file", "parent": "tests", "lines": random.randint(80, 200)},
    ]

    # Generate mock edges (imports)
    edges = [
        {"source": "index", "target": "app", "type": "import"},
        {"source": "index", "target": "config", "type": "import"},
        {"source": "app", "target": "db", "type": "import"},
        {"source": "app", "target": "button", "type": "import"},
        {"source": "app", "target": "modal", "type": "import"},
        {"source": "app", "target": "helpers", "type": "import"},
        {"source": "button", "target": "helpers", "type": "import"},
        {"source": "modal", "target": "helpers", "type": "import"},
        {"source": "modal", "target": "format", "type": "import"},
        {"source": "db", "target": "config", "type": "import"},
        {"source": "test_app", "target": "app", "type": "import"},
        {"source": "test_utils", "target": "helpers", "type": "import"},
        {"source": "test_utils", "target": "format", "type": "import"},
    ]

    nodes = directories + files

    return {
        "metadata": {
            "repoUrl": repo_url,
            "ref": ref or "main",
            "analyzedAt": None,  # Will be set by the worker
            "version": "1.0.0",
        },
        "nodes": nodes,
        "edges": edges,
    }


def calculate_stats(graph: dict[str, Any]) -> dict[str, Any]:
    """Calculate statistics from the graph."""
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    file_nodes = [n for n in nodes if n.get("type") == "file"]
    dir_nodes = [n for n in nodes if n.get("type") == "directory"]

    total_lines = sum(n.get("lines", 0) for n in file_nodes)

    return {
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "fileCount": len(file_nodes),
        "directoryCount": len(dir_nodes),
        "totalLines": total_lines,
    }
