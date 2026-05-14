import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { fullSync } from "@/sync/syncService";
import { useAppStore } from "@/store/appStore";

const MUSCLE_GROUPS = [
  "all", "chest", "back", "shoulders", "arms", "legs", "glutes", "core", "cardio"
];

export function ExercisesPage() {
  const { isSyncing } = useAppStore();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("all");

  const exercises = useLiveQuery(async () => {
    let q = db.exercises.orderBy("name");
    const all = await q.toArray();
    return all.filter(e => {
      const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
      const matchMuscle = muscle === "all" || (e.muscleGroup || "").toLowerCase() === muscle;
      return matchSearch && matchMuscle;
    });
  }, [search, muscle]);

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader
        title="Exercises"
        right={
          <button onClick={() => fullSync(true)} disabled={isSyncing}
            className="text-xs text-blue border border-blue/30 rounded-lg px-3 py-1.5 active:opacity-70">
            {isSyncing ? "Syncing…" : "↻"}
          </button>
        }
      />

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="input"
        />
      </div>

      {/* Muscle group filter */}
      <div className="px-4 pb-3 shrink-0 flex gap-2 overflow-x-auto scrollbar-none">
        {MUSCLE_GROUPS.map(m => (
          <button key={m} onClick={() => setMuscle(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors capitalize shrink-0 ${
              muscle === m ? "bg-blue text-white" : "bg-card text-secondary border border-border"
            }`}>
            {m}
          </button>
        ))}
      </div>

      {/* Count */}
      {exercises && (
        <p className="text-secondary text-xs px-4 pb-2 shrink-0">
          {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {!exercises ? (
          <p className="text-secondary text-sm text-center pt-16">Loading…</p>
        ) : exercises.length === 0 ? (
          <div className="text-center pt-16">
            <p className="text-primary font-medium">No exercises found</p>
            <p className="text-secondary text-sm mt-1">Try a different search or muscle group</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {exercises.map(e => (
              <div key={e.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-primary text-sm font-medium truncate">{e.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {e.equipment && (
                      <span className="text-secondary text-xs">{e.equipment}</span>
                    )}
                    {e.muscleGroup && (
                      <span className="text-blue text-xs capitalize">{e.muscleGroup}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
