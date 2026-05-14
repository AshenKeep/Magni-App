/**
 * WorkoutLoggerPage — logs sets for a workout session
 * Shows each exercise with its sets, target values, and input fields for actual values
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type WorkoutSet } from "@/db";
import { workoutsApi } from "@/api/client";
import { queueMutation } from "@/sync/syncService";
import { format } from "date-fns";

// ─── Set row ─────────────────────────────────────────────────────────────────

function SetRow({ set, onUpdate }: {
  set: WorkoutSet;
  onUpdate: (id: string, patch: Partial<WorkoutSet>) => void;
}) {
  const isStrength = set.logType === "strength";
  const isCardio = set.logType === "cardio";

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${set.isDone ? "bg-success/10" : "bg-card"}`}>
      {/* Set number */}
      <span className="text-secondary text-sm w-5 shrink-0 text-center">{set.setNumber}</span>

      {isStrength && (
        <>
          <div className="flex-1">
            <p className="text-secondary text-[10px] uppercase tracking-wide">Reps</p>
            <input
              type="number"
              inputMode="numeric"
              value={set.reps ?? ""}
              onChange={e => onUpdate(set.id, { reps: parseInt(e.target.value) || null })}
              className="bg-transparent text-primary font-semibold text-sm w-full focus:outline-none"
              placeholder="—"
            />
          </div>
          <div className="flex-1">
            <p className="text-secondary text-[10px] uppercase tracking-wide">kg</p>
            <input
              type="number"
              inputMode="decimal"
              value={set.weightKg ?? ""}
              onChange={e => onUpdate(set.id, { weightKg: parseFloat(e.target.value) || null })}
              className="bg-transparent text-primary font-semibold text-sm w-full focus:outline-none"
              placeholder="—"
            />
          </div>
        </>
      )}

      {isCardio && (
        <>
          <div className="flex-1">
            <p className="text-secondary text-[10px] uppercase tracking-wide">Duration</p>
            <input
              type="number"
              inputMode="numeric"
              value={set.durationSeconds ? Math.round(set.durationSeconds / 60) : ""}
              onChange={e => onUpdate(set.id, { durationSeconds: (parseInt(e.target.value) || 0) * 60 })}
              className="bg-transparent text-primary font-semibold text-sm w-full focus:outline-none"
              placeholder="min"
            />
          </div>
          <div className="flex-1">
            <p className="text-secondary text-[10px] uppercase tracking-wide">Dist (m)</p>
            <input
              type="number"
              inputMode="numeric"
              value={set.distanceM ?? ""}
              onChange={e => onUpdate(set.id, { distanceM: parseFloat(e.target.value) || null })}
              className="bg-transparent text-primary font-semibold text-sm w-full focus:outline-none"
              placeholder="—"
            />
          </div>
        </>
      )}

      {!isStrength && !isCardio && (
        <div className="flex-1">
          <p className="text-secondary text-[10px] uppercase tracking-wide">Duration (min)</p>
          <input
            type="number"
            inputMode="numeric"
            value={set.durationSeconds ? Math.round(set.durationSeconds / 60) : ""}
            onChange={e => onUpdate(set.id, { durationSeconds: (parseInt(e.target.value) || 0) * 60 })}
            className="bg-transparent text-primary font-semibold text-sm w-full focus:outline-none"
            placeholder="—"
          />
        </div>
      )}

      {/* Done toggle */}
      <button
        onClick={() => onUpdate(set.id, { isDone: !set.isDone })}
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          set.isDone ? "bg-success text-white" : "border border-border text-secondary"
        }`}
      >
        ✓
      </button>
    </div>
  );
}

// ─── Exercise section ─────────────────────────────────────────────────────────

function ExerciseSection({ exerciseId, sets, onUpdate }: {
  exerciseId: string;
  sets: WorkoutSet[];
  onUpdate: (id: string, patch: Partial<WorkoutSet>) => void;
}) {
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const doneSets = sets.filter(s => s.isDone).length;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 mb-2">
        <p className="text-primary font-semibold">{exercise?.name ?? "Exercise"}</p>
        <span className="text-secondary text-xs">{doneSets}/{sets.length} sets</span>
      </div>
      <div className="space-y-1.5">
        {sets.sort((a, b) => a.setNumber - b.setNumber).map(set => (
          <SetRow key={set.id} set={set} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

// ─── Main logger ──────────────────────────────────────────────────────────────

export function WorkoutLoggerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workout = useLiveQuery(() => id ? db.workouts.get(id) : undefined, [id]);
  const sets = useLiveQuery(() => id ? db.workoutSets.where("workoutId").equals(id).toArray() : [], [id]);

  // Group sets by exercise
  const exerciseIds = [...new Set((sets ?? []).map(s => s.exerciseId))];

  async function handleUpdate(setId: string, patch: Partial<WorkoutSet>) {
    await db.workoutSets.update(setId, { ...patch, dirty: true });
    // Queue for server sync
    const set = await db.workoutSets.get(setId);
    if (set) {
      await queueMutation("PATCH", `/workouts/${id}/sets/${setId}`, patch);
    }
  }

  async function handleFinish() {
    if (!id || finishing) return;
    setFinishing(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const startedAt = workout?.startedAt ? new Date(workout.startedAt).getTime() : Date.now();
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

      await db.workouts.update(id, {
        endedAt: now,
        durationSeconds,
        dirty: true,
      });

      await workoutsApi.update(id, {
        ended_at: now,
        duration_seconds: durationSeconds,
      });

      navigate("/workouts", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finish workout");
      setFinishing(false);
    }
  }

  if (!workout) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary">Loading workout…</p>
      </div>
    );
  }

  const totalSets = sets?.length ?? 0;
  const doneSets = sets?.filter(s => s.isDone).length ?? 0;

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-secondary text-sm active:opacity-70">← Back</button>
        <div className="text-center">
          <p className="text-primary font-semibold">{workout.title || "Workout"}</p>
          <p className="text-secondary text-xs">{doneSets}/{totalSets} sets done</p>
        </div>
        <div className="w-12" />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border shrink-0">
        <div
          className="h-full bg-blue transition-all"
          style={{ width: totalSets > 0 ? `${(doneSets / totalSets) * 100}%` : "0%" }}
        />
      </div>

      {/* Workout started time */}
      <div className="px-4 py-2 shrink-0">
        <p className="text-secondary text-xs">
          Started {format(new Date(workout.startedAt), "HH:mm")}
          {!workout.endedAt && " · In progress"}
          {workout.endedAt && ` · Finished ${format(new Date(workout.endedAt), "HH:mm")}`}
        </p>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {exerciseIds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary text-sm">No exercises in this workout</p>
          </div>
        ) : (
          exerciseIds.map(exId => (
            <ExerciseSection
              key={exId}
              exerciseId={exId}
              sets={(sets ?? []).filter(s => s.exerciseId === exId)}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border shrink-0 space-y-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        {error && (
          <p className="text-danger text-sm text-center">{error}</p>
        )}
        {!workout.endedAt && (
          <button
            onClick={handleFinish}
            disabled={finishing}
            className="btn-primary w-full py-4 text-base disabled:opacity-50"
          >
            {finishing ? "Finishing…" : "✓ Finish workout"}
          </button>
        )}
        {workout.endedAt && (
          <div className="text-center">
            <span className="text-success text-sm font-medium">✓ Workout complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
