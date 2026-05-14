import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { statsApi } from "@/api/client";
import { useAppStore } from "@/store/appStore";
import { fullSync } from "@/sync/syncService";
import { db } from "@/db";
import { format } from "date-fns";

function StatCard({ label, value, accent = "blue" }: {
  label: string; value: string; accent?: "blue" | "magenta";
}) {
  return (
    <div className={`card flex-1 p-4 border-t-2 ${accent === "blue" ? "border-t-blue" : "border-t-magenta"}`}>
      <p className="text-secondary text-[10px] uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent === "blue" ? "text-blue" : "text-magenta"}`}>{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { isSyncing, syncError, lastFullSync } = useAppStore();
  const { data: stats } = useQuery({ queryKey: ["dashboard"], queryFn: statsApi.dashboard });
  const todayHealth = useLiveQuery(() => db.healthDays.get(format(new Date(), "yyyy-MM-dd")));

  // Check for active (unfinished) workout
  const activeWorkout = useLiveQuery(
    () => db.workouts.filter(w => !w.endedAt).first(),
    []
  );

  const fmtDur = (s?: number | null) => {
    if (!s) return "—";
    const m = Math.round(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader
        title="Dashboard"
        right={
          <button onClick={() => fullSync(true)} disabled={isSyncing}
            className="text-xs text-blue border border-blue/30 rounded-lg px-3 py-1.5 active:opacity-70">
            {isSyncing ? "Syncing…" : "↻ Sync"}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {/* Active workout banner */}
        {activeWorkout && (
          <button
            onClick={() => navigate(`/workouts/${activeWorkout.id}`)}
            className="w-full bg-warning/10 border border-warning/40 rounded-xl px-4 py-3.5 flex items-center justify-between text-left active:opacity-70"
          >
            <div>
              <p className="text-warning font-semibold text-sm">⚡ Workout in progress</p>
              <p className="text-primary text-sm mt-0.5">{activeWorkout.title || "Workout"}</p>
              <p className="text-secondary text-xs mt-0.5">
                Started {format(new Date(activeWorkout.startedAt), "HH:mm")}
              </p>
            </div>
            <span className="text-warning text-lg font-bold">→</span>
          </button>
        )}

        {syncError && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm">{syncError}</div>
        )}

        {/* Stats */}
        <div className="flex gap-3">
          <StatCard label="Total workouts" value={String(stats?.total_workouts ?? "—")} />
          <StatCard label="This week" value={String(stats?.workouts_this_week ?? "—")} />
        </div>
        <div className="flex gap-3">
          <StatCard label="Streak" value={`${stats?.current_streak_days ?? "—"} days`} accent="magenta" />
          <StatCard label="Avg duration" value={fmtDur(stats?.avg_workout_duration_seconds)} accent="magenta" />
        </div>

        {/* Today's health */}
        {todayHealth && (
          <div className="card p-4 space-y-3">
            <p className="text-secondary text-xs uppercase tracking-wider">Today · Health Connect</p>
            <div className="grid grid-cols-2 gap-3">
              {todayHealth.steps != null && (
                <div><p className="text-secondary text-xs">Steps</p><p className="text-primary font-semibold">{todayHealth.steps.toLocaleString()}</p></div>
              )}
              {todayHealth.restingHr != null && (
                <div><p className="text-secondary text-xs">Resting HR</p><p className="text-primary font-semibold">{todayHealth.restingHr} bpm</p></div>
              )}
              {todayHealth.activeCalories != null && (
                <div><p className="text-secondary text-xs">Active cal</p><p className="text-primary font-semibold">{todayHealth.activeCalories} kcal</p></div>
              )}
              {todayHealth.sleepHours != null && (
                <div><p className="text-secondary text-xs">Sleep</p><p className="text-primary font-semibold">{todayHealth.sleepHours}h</p></div>
              )}
            </div>
          </div>
        )}

        {lastFullSync && (
          <p className="text-secondary text-xs text-center">
            Last sync {format(new Date(lastFullSync), "d MMM · HH:mm")}
          </p>
        )}
      </div>
    </div>
  );
}
