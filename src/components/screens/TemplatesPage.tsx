import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db, type Template, type TemplateExercise, type TemplateSet } from "@/db";
import { templatesApi } from "@/api/client";
import { fullSync } from "@/sync/syncService";
import { useAppStore } from "@/store/appStore";
import { PageHeader } from "@/components/ui/PageHeader";

interface TemplateWithExercises extends Template {
  exercises: Array<TemplateExercise & { sets: TemplateSet[]; exerciseName: string }>;
}

function TemplateCard({
  template, expanded, onExpand, onStart,
}: {
  template: TemplateWithExercises;
  expanded: boolean;
  onExpand: () => void;
  onStart: () => void;
}) {
  const totalSets = template.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onExpand}
        className="w-full text-left px-4 py-4 flex items-start justify-between gap-3 active:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-primary font-semibold text-base">{template.name}</p>
          {template.notes && (
            <p className="text-secondary text-sm mt-0.5 truncate">{template.notes}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-secondary text-xs">
              {template.exercises.length} exercise{template.exercises.length !== 1 ? "s" : ""}
            </span>
            {totalSets > 0 && (
              <span className="text-secondary text-xs">· {totalSets} sets</span>
            )}
          </div>
        </div>
        <span className="text-secondary text-lg mt-0.5">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border/50">
          {template.exercises.length === 0 ? (
            <p className="text-secondary text-sm px-4 py-3">No exercises yet</p>
          ) : (
            <div className="divide-y divide-border/30">
              {template.exercises
                .sort((a, b) => a.order - b.order)
                .map(ex => (
                  <div key={ex.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-primary text-sm font-medium truncate">{ex.exerciseName}</p>
                      <p className="text-secondary text-xs mt-0.5 capitalize">{ex.logType}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-blue text-sm font-semibold">{ex.sets.length} sets</p>
                      {ex.sets[0]?.targetReps != null && (
                        <p className="text-secondary text-xs">
                          {ex.sets[0].targetReps} reps
                          {ex.sets[0].targetWeightKg ? ` · ${ex.sets[0].targetWeightKg}kg` : ""}
                        </p>
                      )}
                      {ex.sets[0]?.targetDurationSeconds != null && (
                        <p className="text-secondary text-xs">
                          {Math.round(ex.sets[0].targetDurationSeconds / 60)}min
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border/50">
        <button
          onClick={onStart}
          className="w-full bg-blue text-white font-semibold py-3.5 text-sm flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
        >
          <span>▶</span> Start workout
        </button>
      </div>
    </div>
  );
}

function StartSheet({
  template, loading, onConfirm, onCancel,
}: {
  template: TemplateWithExercises;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const totalSets = template.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full bg-card border-t border-border rounded-t-2xl p-6 space-y-5">
        <div>
          <h2 className="text-primary text-lg font-bold">{template.name}</h2>
          <p className="text-secondary text-sm mt-1">
            {template.exercises.length} exercises · {totalSets} sets
          </p>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {template.exercises
            .sort((a, b) => a.order - b.order)
            .map(ex => (
              <div key={ex.id} className="flex items-center justify-between py-1">
                <p className="text-primary text-sm">{ex.exerciseName}</p>
                <p className="text-secondary text-sm">{ex.sets.length} sets</p>
              </div>
            ))}
        </div>

        <div className="space-y-3 pt-1">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary w-full py-4 text-base disabled:opacity-50"
          >
            {loading ? "Starting…" : "▶  Start workout"}
          </button>
          <button onClick={onCancel} className="w-full py-3.5 text-secondary text-sm active:opacity-70">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function TemplatesPage() {
  const navigate = useNavigate();
  const { isSyncing } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startingTemplate, setStartingTemplate] = useState<TemplateWithExercises | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templates = useLiveQuery(async () => {
    const tmps = await db.templates.orderBy("name").toArray();
    const result: TemplateWithExercises[] = [];

    for (const t of tmps) {
      const exercises = await db.templateExercises.where("templateId").equals(t.id).toArray();

      const withDetails = await Promise.all(
        exercises.map(async ex => {
          const sets = await db.templateSets
            .where("templateExerciseId").equals(ex.id)
            .sortBy("setNumber");
          const exercise = await db.exercises.get(ex.exerciseId);
          return { ...ex, sets, exerciseName: exercise?.name ?? "Unknown exercise" };
        })
      );

      result.push({ ...t, exercises: withDetails });
    }
    return result;
  }, []);

  const handleStart = async () => {
    if (!startingTemplate) return;
    setStarting(true);
    setError(null);
    try {
      const { workout_id } = await templatesApi.start(startingTemplate.id);
      setStartingTemplate(null);
      navigate(`/workouts/${workout_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start workout");
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader
        title="Templates"
        right={
          <button
            onClick={() => fullSync(true)}
            disabled={isSyncing}
            className="text-xs text-blue border border-blue/30 rounded-lg px-3 py-1.5 active:opacity-70"
          >
            {isSyncing ? "Syncing…" : "↻"}
          </button>
        }
      />

      {error && (
        <div className="mx-4 mb-3 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
        {templates === undefined ? (
          <p className="text-secondary text-sm text-center pt-16">Loading…</p>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <p className="text-primary font-medium">No templates yet</p>
            <p className="text-secondary text-sm mt-1">Create templates on the web app, then sync here.</p>
            <button onClick={() => fullSync(true)} disabled={isSyncing} className="btn-primary mt-4 px-6">
              {isSyncing ? "Syncing…" : "↻ Sync now"}
            </button>
          </div>
        ) : (
          templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              expanded={expandedId === t.id}
              onExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
              onStart={() => { setError(null); setStartingTemplate(t); }}
            />
          ))
        )}
      </div>

      {startingTemplate && (
        <StartSheet
          template={startingTemplate}
          loading={starting}
          onConfirm={handleStart}
          onCancel={() => { setStartingTemplate(null); setStarting(false); }}
        />
      )}
    </div>
  );
}
