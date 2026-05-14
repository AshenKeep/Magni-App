import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { statsApi } from "@/api/client";
import { useAppStore } from "@/store/appStore";
import { fullSync } from "@/sync/syncService";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { format } from "date-fns";

function StatCard({ label, value, accent = "blue" }: { label: string; value: string; accent?: "blue" | "magenta" }) {
  return (
    <div className={`card flex-1 p-4 border-t-2 ${accent === "blue" ? "border-t-blue" : "border-t-magenta"}`}>
      <p className="text-secondary text-[10px] uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent === "blue" ? "text-blue" : "text-magenta"}`}>{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { isSyncing, syncError, lastFullSync, userName } = useAppStore();
  const { data: stats } = useQuery({ queryKey: ["dashboard"], queryFn: statsApi.dashboard });
  const todayHealth = useLiveQuery(() => db.healthDays.get(format(new Date(), "yyyy-MM-dd")));
  const fmtDur = (s?: number | null) => { if (!s) return "—"; const m = Math.round(s/60); return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`; };

  return (
    <div className="p-4 space-y-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <PageHeader
        title="Dashboard"
        right={
          <button onClick={() => fullSync(true)} disabled={isSyncing}
            className="text-xs text-blue border border-blue/30 rounded-lg px-3 py-1.5 active:opacity-70">
            {isSyncing ? "Syncing…" : "↻ Sync"}
          </button>
        }
      />
          <div>
            <h1 className="text-primary font-bold">Dashboard</h1>
            {userName && <p className="text-secondary text-xs">Hey, {userName}</p>}
          </div>
        </div>
        <button onClick={() => fullSync(true)} disabled={isSyncing}
          className="text-xs text-blue border border-blue/30 rounded-lg px-3 py-1.5 active:opacity-70">
          {isSyncing ? "Syncing…" : "↻ Sync"}
        </button>
      </div>

      {syncError && <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm">{syncError}</div>}

      <div className="flex gap-3">
        <StatCard label="Total workouts" value={String(stats?.total_workouts ?? "—")} />
        <StatCard label="This week" value={String(stats?.workouts_this_week ?? "—")} />
      </div>
      <div className="flex gap-3">
        <StatCard label="Streak" value={`${stats?.current_streak_days ?? "—"} days`} accent="magenta" />
        <StatCard label="Avg duration" value={fmtDur(stats?.avg_workout_duration_seconds)} accent="magenta" />
      </div>

      {/* Today's health from Health Connect */}
      {todayHealth && (
        <div className="card p-4 space-y-3">
          <p className="text-secondary text-xs uppercase tracking-wider">Today · Health Connect</p>
          <div className="grid grid-cols-2 gap-3">
            {todayHealth.steps != null && <div><p className="text-secondary text-xs">Steps</p><p className="text-primary font-semibold">{todayHealth.steps.toLocaleString()}</p></div>}
            {todayHealth.restingHr != null && <div><p className="text-secondary text-xs">Resting HR</p><p className="text-primary font-semibold">{todayHealth.restingHr} bpm</p></div>}
            {todayHealth.activeCalories != null && <div><p className="text-secondary text-xs">Active cal</p><p className="text-primary font-semibold">{todayHealth.activeCalories} kcal</p></div>}
            {todayHealth.sleepHours != null && <div><p className="text-secondary text-xs">Sleep</p><p className="text-primary font-semibold">{todayHealth.sleepHours}h</p></div>}
          </div>
        </div>
      )}

      {lastFullSync && (
        <p className="text-secondary text-xs text-center">Last sync {format(new Date(lastFullSync), "d MMM · HH:mm")}</p>
      )}
    </div>
  );
}
