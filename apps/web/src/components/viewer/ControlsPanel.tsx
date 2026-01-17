"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ProjectDetailResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const THEMES = ["city", "space", "forest"] as const;

type Props = {
  project: ProjectDetailResponse["data"]["project"] | null;
};

export function ControlsPanel({ project }: Props) {
  const [theme, setTheme] = useState<string>(
    (project?.currentConfig?.theme as string) ?? "city"
  );
  const [saving, setSaving] = useState(false);

  async function saveConfig() {
    if (!project) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        json: {
          currentConfig: {
            ...project.currentConfig,
            theme,
          },
        },
      });
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  const stats = project?.latestJob?.result?.stats as Record<string, number> | undefined;

  return (
    <aside className="overflow-y-auto glass border-l border-white/10 p-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Theme</div>
            <Badge variant="secondary">{theme}</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "secondary"}
                size="sm"
                onClick={() => setTheme(t)}
              >
                {t}
              </Button>
            ))}
          </div>

          <Separator className="my-4" />

          <Button
            onClick={saveConfig}
            disabled={saving || !project}
            className="w-full"
          >
            {saving ? "Saving..." : "Save Config"}
          </Button>
        </CardContent>
      </Card>

      {stats && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="mb-2 font-semibold">Stats</div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{key}:</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="mb-2 font-semibold">Project Info</div>
          <div className="space-y-2 text-sm">
            {project?.repoUrl && (
              <div>
                <div className="text-muted-foreground">Repository</div>
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {project.repoUrl}
                </a>
              </div>
            )}
            {project?.ref && (
              <div>
                <div className="text-muted-foreground">Branch/Ref</div>
                <div>{project.ref}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 text-sm text-muted-foreground">
        Camera / filters / additional controls will go here.
      </div>
    </aside>
  );
}
