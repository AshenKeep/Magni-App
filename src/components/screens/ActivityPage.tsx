import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { syncHealthData } from "@/health/healthService";
import { format, subDays } from "date-fns";

type Range = 7 | 30 | 90;

export function ActivityPage() {
  const [range, setRange] = useState<Range>(30);
  const [healthSyncing, setHealthSyncing] = useState(false);

  const healthDays = useLiveQuery(async () => {
    const from = format(subDays(new Date(), range), "yyyy-MM-dd");
    return db.healthDays
      .where("date")
      .aboveOrEqual(from)
      .reverse()
      .toArray();
  }, [range]);

  const recentWorkouts = useLiveQuery(async () => {
    const from = subDays(new Date(), range).toISOString();
    return db.workouts
      .where("startedAt")
      .aboveOrEqual(from)
      .reverse()
      .toArray();
  }, [range]);

  const handleHealthSync = async () => {
    setHealthSyncing(true);
    try { await syncHealthData(range); }
    finally { setHealthSyncing(false); }
  };

  // Aggregate stats
  const totalSteps = healthDays?.reduce((s, d) => s + (d.steps ?? 0), 0) ?? 0;
  const avgSteps = healthDays?.length ? Math.round(totalSteps / healthDays.length) : 0;
  const avgHr = healthDays?.filter(d => d.restingHr).length
    ? Math.round(healthDays!.filter(d => d.restingHr).reduce((s, d) => s + d.restingHr!, 0) / healthDays!.filter(d => d.restingHr).length)
    : null;
  const totalCal = healthDays?.reduce((s, d) => s + (d.activeCalories ?? 0), 0) ?? 0;
  const avgSleep = healthDays?.filter(d => d.sleepHours).length
    ? (healthDays!.filter(d => d.sleepHours).reduce((s, d) => s + d.sleepHours!, 0) / healthDays!.filter(d => d.sleepHours).length).toFixed(1)
    : null;

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader
        title="Activity"
        right={
          <div className="flex items-center gap-2">
            {([7, 30, 90] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  range === r ? "bg-blue text-white" : "text-secondary"
                }`}>
                {r}d
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-secondary text-xs uppercase tracking-wider">Avg steps/day</p>
            <p className="text-blue text-2xl font-bold mt-1">{avgSteps > 0 ? avgSteps.toLocaleString() : "—"}</p>
          </div>
          <div className="card p-4">
            <p className="text-secondary text-xs uppercase tracking-wider">Workouts</p>
            <p className="text-blue text-2xl font-bold mt-1">{recentWorkouts?.filter(w => w.endedAt).length ?? "—"}</p>
          </div>
          <div className="card p-4">
            <p className="text-secondary text-xs uppercase tracking-wider">Avg resting HR</p>
            <p className="text-magenta text-2xl font-bold mt-1">{avgHr ? `${avgHr} bpm` : "—"}</p>
          </div>
          <div className="card p-4">
            <p className="text-secondary text-xs uppercase tracking-wider">Avg sleep</p>
            <p className="text-magenta text-2xl font-bold mt-1">{avgSleep ? `${avgSleep}h` : "—"}</p>
          </div>
        </div>

        {/* Total calories */}
        {totalCal > 0 && (
          <div className="card px-4 py-3 flex items-center justify-between">
            <p className="text-secondary text-sm">Total active calories</p>
            <p className="text-primary font-semibold">{totalCal.toLocaleString()} kcal</p>
          </div>
        )}

        {/* Health Connect sync */}
        <button onClick={handleHealthSync} disabled={healthSyncing}
          className="w-full card px-4 py-3 flex items-center justify-between active:opacity-70 disabled:opacity-50">
          <div>
            <p className="text-primary text-sm font-medium">Sync from Health Connect</p>
            <p className="text-secondary text-xs mt-0.5">Pulls Garmin data for last {range} days</p>
          </div>
          <span className="text-blue text-sm">{healthSyncing ? "Syncing…" : "↻"}</span>
        </button>

        {/* Daily breakdown */}
        {healthDays && healthDays.length > 0 && (
          <div>
            <p className="text-secondary text-xs uppercase tracking-wider mb-2">Daily breakdown</p>
            <div className="card overflow-hidden divide-y divide-border/40">
              {healthDays.slice(0, 30).map(d => (
                <div key={d.date} className="px-4 py-3 flex items-center justify-between">
                  <p className="text-secondary text-sm">{format(new Date(d.date + "T12:00:00"), "EEE d MMM")}</p>
                  <div className="flex items-center gap-4 text-right">
                    {d.steps != null && <p className="text-primary text-sm">{d.steps.toLocaleString()} steps</p>}
                    {d.restingHr != null && <p className="text-secondary text-xs">{d.restingHr} bpm</p>}
                    {d.sleepHours != null && <p className="text-secondary text-xs">{d.sleepHours}h sleep</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!healthDays || healthDays.length === 0) && (
          <div className="text-center py-8">
            <p className="text-primary font-medium">No health data yet</p>
            <p className="text-secondary text-sm mt-1">Tap sync above to pull from Health Connect</p>
          </div>
        )}
      </div>
    </div>
  );
}
