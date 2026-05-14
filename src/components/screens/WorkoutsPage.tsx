import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db, type Workout } from "@/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { fullSync } from "@/sync/syncService";
import { useAppStore } from "@/store/appStore";
import { format, isToday, isYesterday, parseISO } from "date-fns";

function formatDate(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE d MMM");
}

function formatDuration(secs: number | null) {
  if (!secs) return null;
  const m = Math.round(secs / 60);
  return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;
}

function WorkoutRow({ workout }: { workout: Workout }) {
  const navigate = useNavigate();
  const isComplete = !!workout.endedAt;

  return (
    <button
      onClick={() => navigate(`/workouts/${workout.id}`)}
      className="w-full card px-4 py-3.5 flex items-center justify-between text-left active:opacity-70 transition-opacity"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isComplete ? "bg-success" : "bg-warning"}`} />
          <p className="text-primary font-medium truncate">{workout.title || "Workout"}</p>
        </div>
        <p className="text-secondary text-sm mt-0.5 pl-4">
          {formatDate(workout.startedAt)}
          {formatDuration(workout.durationSeconds) && ` · ${formatDuration(workout.durationSeconds)}`}
          {!isComplete && " · In progress"}
        </p>
      </div>
      <span className="text-secondary text-lg ml-3">›</span>
    </button>
  );
}

export function WorkoutsPage() {
  const { isSyncing } = useAppStore();
  const [filter, setFilter] = useState<"all" | "complete" | "planned">("all");

  const workouts = useLiveQuery(
    () => db.workouts.orderBy("startedAt").reverse().limit(100).toArray(),
    []
  );

  const filtered = workouts?.filter(w => {
    if (filter === "complete") return !!w.endedAt;
    if (filter === "planned") return !w.endedAt;
    return true;
  });

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader
        title="Workouts"
        right={
          <button onClick={() => fullSync(true)} disabled={isSyncing}
            className="text-xs text-blue border border-blue/30 rounded-lg px-3 py-1.5 active:opacity-70">
            {isSyncing ? "Syncing…" : "↻"}
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 pb-3 shrink-0">
        {(["all", "complete", "planned"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f ? "bg-blue text-white" : "bg-card text-secondary border border-border"
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {!filtered ? (
          <p className="text-secondary text-sm text-center pt-16">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center pt-16">
            <p className="text-primary font-medium">No workouts yet</p>
            <p className="text-secondary text-sm mt-1">Start one from Templates</p>
          </div>
        ) : (
          filtered.map(w => <WorkoutRow key={w.id} workout={w} />)
        )}
      </div>
    </div>
  );
}
