import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type WorkoutSet } from "@/db";
import { workoutsApi } from "@/api/client";
import { queueMutation } from "@/sync/syncService";
import { scheduleWorkoutNotification, cancelWorkoutNotification } from "@/services/notificationService";

// ─── Rest timer hook ──────────────────────────────────────────────────────────

function useRestTimer() {
  const [timers, setTimers] = useState<Record<string, { secs: number; running: boolean }>>({});
  const intervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  function startTimer(id: string) {
    if (intervals.current[id]) return;
    intervals.current[id] = setInterval(() => {
      setTimers(prev => ({ ...prev, [id]: { secs: (prev[id]?.secs ?? 0) + 1, running: true } }));
    }, 1000);
    setTimers(prev => ({ ...prev, [id]: { secs: prev[id]?.secs ?? 0, running: true } }));
  }

  function resetTimer(id: string) {
    clearInterval(intervals.current[id]);
    delete intervals.current[id];
    setTimers(prev => ({ ...prev, [id]: { secs: 0, running: false } }));
  }

  useEffect(() => () => { Object.values(intervals.current).forEach(clearInterval); }, []);

  function fmt(id: string) {
    const secs = timers[id]?.secs ?? 0;
    return `${Math.floor(secs / 60).toString().padStart(2, "0")}:${(secs % 60).toString().padStart(2, "0")}`;
  }

  return { timers, startTimer, resetTimer, fmt };
}

// ─── Elapsed workout timer ────────────────────────────────────────────────────

function useElapsed(startedAt: string | null) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const base = new Date(startedAt).getTime();
    const tick = () => setSecs(Math.floor((Date.now() - base) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return `${Math.floor(secs / 60).toString().padStart(2, "0")}:${(secs % 60).toString().padStart(2, "0")}`;
}

// ─── Set row ─────────────────────────────────────────────────────────────────

function SetRow({ set, onUpdate, timer }: {
  set: WorkoutSet;
  onUpdate: (id: string, patch: Partial<WorkoutSet>) => void;
  timer: ReturnType<typeof useRestTimer>;
}) {
  const isStrength = set.logType === "strength";
  const isRunning = timer.timers[set.id]?.running ?? false;

  return (
    <div className={`rounded-xl border transition-colors mb-3 ${set.isDone ? "border-success/50 bg-success/5" : "border-border bg-card"}`}>
      {/* Set header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-secondary text-xs font-medium uppercase tracking-wide">
          Set {set.setNumber} · {set.logType}
        </span>
        <button
          onClick={() => onUpdate(set.id, { isDone: !set.isDone })}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            set.isDone ? "bg-success text-white" : "border border-border text-secondary"
          }`}
        >
          {set.isDone ? "✓ Done" : "Done"}
        </button>
      </div>

      {/* Inputs */}
      <div className="flex items-center gap-3 px-4 pb-3">
        {isStrength && (
          <>
            <div className="flex-1">
              <p className="text-secondary text-[10px] uppercase tracking-wide mb-1">Reps</p>
              <input
                type="number" inputMode="numeric"
                value={set.reps ?? ""}
                onChange={e => onUpdate(set.id, { reps: parseInt(e.target.value) || null })}
                className="w-full bg-muted rounded-lg px-3 py-2.5 text-primary font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue"
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <p className="text-secondary text-[10px] uppercase tracking-wide mb-1">Weight (kg)</p>
              <input
                type="number" inputMode="decimal"
                value={set.weightKg ?? ""}
                onChange={e => onUpdate(set.id, { weightKg: parseFloat(e.target.value) || null })}
                className="w-full bg-muted rounded-lg px-3 py-2.5 text-primary font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue"
                placeholder="0"
              />
            </div>
          </>
        )}

        {set.logType === "cardio" && (
          <>
            <div className="flex-1">
              <p className="text-secondary text-[10px] uppercase tracking-wide mb-1">Duration (min)</p>
              <input
                type="number" inputMode="numeric"
                value={set.durationSeconds ? Math.round(set.durationSeconds / 60) : ""}
                onChange={e => onUpdate(set.id, { durationSeconds: (parseInt(e.target.value) || 0) * 60 })}
                className="w-full bg-muted rounded-lg px-3 py-2.5 text-primary font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue"
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <p className="text-secondary text-[10px] uppercase tracking-wide mb-1">Distance (m)</p>
              <input
                type="number" inputMode="numeric"
                value={set.distanceM ?? ""}
                onChange={e => onUpdate(set.id, { distanceM: parseFloat(e.target.value) || null })}
                className="w-full bg-muted rounded-lg px-3 py-2.5 text-primary font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue"
                placeholder="0"
              />
            </div>
          </>
        )}

        {!isStrength && set.logType !== "cardio" && (
          <div className="flex-1">
            <p className="text-secondary text-[10px] uppercase tracking-wide mb-1">Duration (min)</p>
            <input
              type="number" inputMode="numeric"
              value={set.durationSeconds ? Math.round(set.durationSeconds / 60) : ""}
              onChange={e => onUpdate(set.id, { durationSeconds: (parseInt(e.target.value) || 0) * 60 })}
              className="w-full bg-muted rounded-lg px-3 py-2.5 text-primary font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue"
              placeholder="0"
            />
          </div>
        )}
      </div>

      {/* Rest timer */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-border/50">
        <span className="text-secondary text-xs">Rest</span>
        <span className="text-primary font-mono text-sm font-semibold">{timer.fmt(set.id)}</span>
        <button
          onClick={() => isRunning ? timer.resetTimer(set.id) : timer.startTimer(set.id)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
            isRunning ? "bg-warning/20 text-warning" : "bg-blue text-white"
          }`}
        >
          {isRunning ? "Reset" : "Start"}
        </button>
      </div>
    </div>
  );
}

// ─── Exercise page ────────────────────────────────────────────────────────────

function ExercisePage({ exerciseId, sets, onUpdate, timer }: {
  exerciseId: string;
  sets: WorkoutSet[];
  onUpdate: (id: string, patch: Partial<WorkoutSet>) => void;
  timer: ReturnType<typeof useRestTimer>;
}) {
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const doneSets = sets.filter(s => s.isDone).length;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="flex items-center gap-3 mb-4">
        {exercise?.gifUrl ? (
          <img src={exercise.gifUrl} alt={exercise.name} className="w-12 h-12 rounded-lg object-cover bg-muted" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl">🏋️</div>
        )}
        <div>
          <p className="text-primary font-bold text-lg leading-tight">{exercise?.name ?? "Exercise"}</p>
          <p className="text-secondary text-sm">{doneSets}/{sets.length} sets done</p>
        </div>
      </div>
      {sets.sort((a, b) => a.setNumber - b.setNumber).map(set => (
        <SetRow key={set.id} set={set} onUpdate={onUpdate} timer={timer} />
      ))}
    </div>
  );
}

// ─── Main logger ──────────────────────────────────────────────────────────────

export function WorkoutLoggerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRestTimer();

  const workout = useLiveQuery(() => id ? db.workouts.get(id) : undefined, [id]);
  const allSets = useLiveQuery(() => id ? db.workoutSets.where("workoutId").equals(id).toArray() : [], [id]) ?? [];
  const elapsed = useElapsed(workout?.startedAt ?? null);

  const exerciseIds = [...new Set(allSets.map(s => s.exerciseId))];
  const currentExerciseId = exerciseIds[exerciseIndex];
  const currentSets = allSets.filter(s => s.exerciseId === currentExerciseId);
  const totalSets = allSets.length;
  const doneSets = allSets.filter(s => s.isDone).length;
  const isFirst = exerciseIndex === 0;
  const isLast = exerciseIndex === exerciseIds.length - 1;

  useEffect(() => {
    if (workout && !workout.endedAt && id) {
      scheduleWorkoutNotification(id, workout.title ?? "Workout in progress");
    }
  }, [workout?.id, workout?.endedAt, id]);

  async function handleUpdate(setId: string, patch: Partial<WorkoutSet>) {
    await db.workoutSets.update(setId, { ...patch, dirty: true });
    await queueMutation("PATCH", `/workouts/${id}/sets/${setId}`, patch);
  }

  async function handleFinish() {
    if (!id || finishing) return;
    setFinishing(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const startedAt = workout?.startedAt ? new Date(workout.startedAt).getTime() : Date.now();
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
      await db.workouts.update(id, { endedAt: now, durationSeconds, dirty: true });
      await workoutsApi.update(id, { ended_at: now, duration_seconds: durationSeconds });
      await cancelWorkoutNotification();
      navigate("/workouts", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finish workout");
      setFinishing(false);
    }
  }

  if (!workout) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="text-primary font-bold">{workout.title || "Workout"}</p>
          <p className="text-blue font-mono font-semibold text-sm">{elapsed}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (confirm("Discard this workout?")) { cancelWorkoutNotification(); navigate(-1); } }}
            className="px-3 py-1.5 rounded-lg border border-border text-secondary text-sm active:opacity-70"
          >
            Discard
          </button>
          <button onClick={handleFinish} disabled={finishing}
            className="btn-primary py-1.5 px-4 text-sm disabled:opacity-50">
            {finishing ? "…" : "Finish ✓"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border shrink-0">
        <div className="h-full bg-blue transition-all" style={{ width: totalSets > 0 ? `${(doneSets / totalSets) * 100}%` : "0%" }} />
      </div>

      {/* Exercise indicators */}
      {exerciseIds.length > 1 && (
        <div className="px-4 py-2 shrink-0 flex items-center justify-between">
          <span className="text-secondary text-xs">Exercise {exerciseIndex + 1} of {exerciseIds.length}</span>
          <div className="flex gap-1">
            {exerciseIds.map((_, i) => (
              <button key={i} onClick={() => setExerciseIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === exerciseIndex ? "bg-blue" : "bg-border"}`} />
            ))}
          </div>
        </div>
      )}

      {/* Exercise page */}
      {currentExerciseId ? (
        <ExercisePage exerciseId={currentExerciseId} sets={currentSets} onUpdate={handleUpdate} timer={timer} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-secondary text-sm">No exercises in this workout</p>
        </div>
      )}

      {/* Navigation footer */}
      <div className="px-4 pt-2 pb-4 border-t border-border shrink-0 space-y-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        {error && <p className="text-danger text-sm text-center">{error}</p>}
        <div className="flex items-center gap-3">
          <button onClick={() => setExerciseIndex(i => Math.max(0, i - 1))} disabled={isFirst}
            className="flex-1 py-3.5 border border-border rounded-xl text-primary font-semibold disabled:opacity-30 active:opacity-70">
            ← Previous
          </button>
          {!isLast ? (
            <button onClick={() => setExerciseIndex(i => Math.min(exerciseIds.length - 1, i + 1))}
              className="flex-1 py-3.5 bg-blue text-white rounded-xl font-semibold active:opacity-70">
              Next →
            </button>
          ) : (
            <button onClick={handleFinish} disabled={finishing}
              className="flex-1 py-3.5 bg-success text-white rounded-xl font-semibold disabled:opacity-50 active:opacity-70">
              {finishing ? "Finishing…" : "✓ Finish workout"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
