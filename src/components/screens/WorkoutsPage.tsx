import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db, type Workout } from "@/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { fullSync } from "@/sync/syncService";
import { useAppStore } from "@/store/appStore";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addWeeks, subWeeks, eachDayOfInterval,
  isSameMonth, isToday, startOfDay, endOfDay,
} from "date-fns";

type View = "day" | "week" | "month";

function fmtDuration(secs: number | null) {
  if (!secs) return null;
  const m = Math.round(secs / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function workoutsForDay(workouts: Workout[], day: Date): Workout[] {
  const start = startOfDay(day).toISOString();
  const end = endOfDay(day).toISOString();
  return workouts.filter(w => w.startedAt >= start && w.startedAt <= end);
}

function WorkoutChip({ workout, compact, onClick }: {
  workout: Workout;
  compact?: boolean;
  onClick: () => void;
}) {
  const dur = fmtDuration(workout.durationSeconds);
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className="w-full text-left bg-blue/80 rounded px-1.5 py-0.5 mb-0.5 active:opacity-70"
    >
      <p className="text-white text-[10px] leading-tight truncate font-medium">
        {workout.title || "Workout"}
        {!compact && dur ? ` · ${dur}` : ""}
      </p>
    </button>
  );
}

function MonthView({ current, workouts, onDayClick, onWorkoutClick }: {
  current: Date;
  workouts: Workout[];
  onDayClick: (day: Date) => void;
  onWorkoutClick: (id: string) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(current), { weekStartsOn: 1 }),
  });

  return (
    <div className="flex-1 flex flex-col px-2 pb-2">
      <div className="grid grid-cols-7 mb-1">
        {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => (
          <div key={d} className="text-center text-secondary text-[10px] py-1">{d}</div>
        ))}
      </div>
      <div
        className="flex-1 grid grid-cols-7 gap-0.5"
        style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}
      >
        {days.map(day => {
          const dayWorkouts = workoutsForDay(workouts, day);
          const inMonth = isSameMonth(day, current);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`flex flex-col rounded-lg p-1 text-left min-h-[60px] transition-colors active:opacity-70
                ${today ? "border border-blue" : "border border-transparent"}
                ${inMonth ? "bg-card" : "bg-card/40"}`}
            >
              <span className={`text-xs font-medium mb-0.5 ${today ? "text-blue" : inMonth ? "text-primary" : "text-secondary"}`}>
                {format(day, "d")}
              </span>
              {dayWorkouts.slice(0, 2).map(w => (
                <WorkoutChip key={w.id} workout={w} compact onClick={() => onWorkoutClick(w.id)} />
              ))}
              {dayWorkouts.length > 2 && (
                <span className="text-[9px] text-secondary">+{dayWorkouts.length - 2} more</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ current, workouts, onDayClick, onWorkoutClick }: {
  current: Date;
  workouts: Workout[];
  onDayClick: (day: Date) => void;
  onWorkoutClick: (id: string) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(current, { weekStartsOn: 1 }),
    end: endOfWeek(current, { weekStartsOn: 1 }),
  });

  return (
    <div className="flex-1 flex flex-col px-2 pb-2">
      <div className="grid grid-cols-7 gap-1 flex-1">
        {days.map(day => {
          const dayWorkouts = workoutsForDay(workouts, day);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`flex flex-col rounded-lg p-1.5 text-left min-h-[120px] bg-card active:opacity-70
                ${today ? "border border-blue" : "border border-transparent"}`}
            >
              <div className="text-center mb-2">
                <p className="text-secondary text-[10px] uppercase">{format(day, "EEE")}</p>
                <p className={`text-sm font-bold ${today ? "text-blue" : "text-primary"}`}>{format(day, "d")}</p>
              </div>
              {dayWorkouts.map(w => (
                <WorkoutChip key={w.id} workout={w} onClick={() => onWorkoutClick(w.id)} />
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ current, workouts, onWorkoutClick }: {
  current: Date;
  workouts: Workout[];
  onWorkoutClick: (id: string) => void;
}) {
  const dayWorkouts = workoutsForDay(workouts, current);
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
      <p className="text-secondary text-sm py-2">{format(current, "EEEE d MMMM yyyy")}</p>
      {dayWorkouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-secondary text-sm">No workouts this day</p>
        </div>
      ) : (
        dayWorkouts.map(w => (
          <button
            key={w.id}
            onClick={() => onWorkoutClick(w.id)}
            className="w-full card px-4 py-3 flex items-center justify-between text-left active:opacity-70"
          >
            <div>
              <p className="text-primary font-medium">{w.title || "Workout"}</p>
              {w.durationSeconds && (
                <p className="text-secondary text-sm">{fmtDuration(w.durationSeconds)}</p>
              )}
            </div>
            <span className="text-secondary text-lg">›</span>
          </button>
        ))
      )}
    </div>
  );
}

export function WorkoutsPage() {
  const navigate = useNavigate();
  const { isSyncing } = useAppStore();
  const [view, setView] = useState<View>("month");
  const [current, setCurrent] = useState(new Date());

  const workouts = useLiveQuery(() => db.workouts.orderBy("startedAt").toArray(), []) ?? [];

  function goBack() {
    if (view === "month") setCurrent(c => subMonths(c, 1));
    else if (view === "week") setCurrent(c => subWeeks(c, 1));
    else setCurrent(c => new Date(c.getTime() - 86400000));
  }

  function goForward() {
    if (view === "month") setCurrent(c => addMonths(c, 1));
    else if (view === "week") setCurrent(c => addWeeks(c, 1));
    else setCurrent(c => new Date(c.getTime() + 86400000));
  }

  function navLabel() {
    if (view === "month") return format(current, "MMMM yyyy");
    if (view === "week") {
      const s = startOfWeek(current, { weekStartsOn: 1 });
      const e = endOfWeek(current, { weekStartsOn: 1 });
      return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
    }
    return format(current, "d MMM yyyy");
  }

  function handleWorkoutClick(id: string) {
    navigate(`/workouts/${id}`);
  }

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader
        title="Schedule"
        right={
          <div className="flex items-center gap-1">
            {(["Day","Week","Month"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v.toLowerCase() as View)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  view === v.toLowerCase() ? "bg-blue text-white" : "text-secondary"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
        <button onClick={goBack} className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded-lg text-primary active:opacity-70">←</button>
        <button onClick={() => setCurrent(new Date())} className="px-3 h-8 flex items-center bg-card border border-border rounded-lg text-primary text-sm font-medium active:opacity-70">Today</button>
        <button onClick={goForward} className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded-lg text-primary active:opacity-70">→</button>
        <span className="text-primary text-sm font-medium ml-1 flex-1 truncate">{navLabel()}</span>
        <button onClick={() => fullSync(true)} disabled={isSyncing} className="text-xs text-blue border border-blue/30 rounded-lg px-2.5 py-1 active:opacity-70 shrink-0">
          {isSyncing ? "…" : "↻"}
        </button>
      </div>

      {view === "month" && <MonthView current={current} workouts={workouts} onDayClick={d => { setCurrent(d); setView("day"); }} onWorkoutClick={handleWorkoutClick} />}
      {view === "week"  && <WeekView  current={current} workouts={workouts} onDayClick={d => { setCurrent(d); setView("day"); }} onWorkoutClick={handleWorkoutClick} />}
      {view === "day"   && <DayView   current={current} workouts={workouts} onWorkoutClick={handleWorkoutClick} />}
    </div>
  );
}
