import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db, type Workout } from "@/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { fullSync } from "@/sync/syncService";
import { useAppStore } from "@/store/appStore";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addWeeks, subWeeks, eachDayOfInterval,
  isSameDay, isSameMonth, isToday, parseISO, startOfDay, endOfDay,
} from "date-fns";

type View = "day" | "week" | "month";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Workout chip ─────────────────────────────────────────────────────────────

function WorkoutChip({ workout, compact = false, onClick }: {
  workout: Workout; compact?: boolean; onClick: () => void;
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

// ─── Month view ───────────────────────────────────────────────────────────────

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

  const DAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <div className="flex-1 flex flex-col px-2 pb-2">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-secondary text-[10px] py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 gap-0.5"
        style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}>
        {days.map(day => {
          const dayWorkouts = workoutsForDay(workouts, day);
          const inMonth = isSameMonth(day, current);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`
                flex flex-col rounded-lg p-1 text-left min-h-[60px] transition-colors active:opacity-70
                ${today ? "border border-blue" : "border border-transparent"}
                ${inMonth ? "bg-card" : "bg-card/40"}
              `}
            >
              <span className={`text-xs font-medium mb-0.5 ${today ? "text-blue" : inMonth ? "text-primary" : "text-secondary"}`}>
                {format(day, "d")}
              </span>
              {dayWorkouts.slice(0, 2).map(w => (
                <WorkoutChip key={w.id} workout={w} compact onWorkoutClick={() => onWorkoutClick(w.id)} />
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

// ─── Week view ────────────────────────────────────────────────────────────────

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
              className={`
                flex flex-col rounded-lg p-1.5 text-left min-h-[120px] bg-card active:opacity-70
                ${today ? "border border-blue" : "border border-transparent"}
              `}
            >
              <div className="text-center mb-2">
                <p className="text-secondary text-[10px] uppercase">{format(day, "EEE")}</p>
                <p className={`text-sm font-bold ${today ? "text-blue" : "text-primary"}`}>{format(day, "d")}</p>
              </div>
              {dayWorkouts.map(w => (
                <WorkoutChip key={w.id} workout={w} onWorkoutClick={() => onWorkoutClick(w.id)} />
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({ current, workouts, onWorkoutClick }: {
  current: Date;
  workouts: Workout[];
  onWorkoutClick: (id: string) => void;
}) {
  const dayWorkouts = workoutsForDay(workouts, current);
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
      <p className="text-secondary text-sm py-2">
        {format(current, "EEEE d MMMM yyyy")}
      </p>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export function WorkoutsPage() {
  const navigate = useNavigate();
  const { isSyncing } = useAppStore();
  const [view, setView] = useState<View>("month");
  const [current, setCurrent] = useState(new Date());

  // Load all workouts from local DB
  const workouts = useLiveQuery(
    () => db.workouts.orderBy("startedAt").toArray(),
    []
  ) ?? [];

  function goBack() {
    if (view === "month") setCurrent(subMonths(current, 1));
    else if (view === "week") setCurrent(subWeeks(current, 1));
    else setCurrent(d => new Date(d.getTime() - 86400000));
  }

  function goForward() {
    if (view === "month") setCurrent(addMonths(current, 1));
    else if (view === "week") setCurrent(addWeeks(current, 1));
    else setCurrent(d => new Date(d.getTime() + 86400000));
  }

  function navLabel() {
    if (view === "month") return format(current, "MMMM yyyy");
    if (view === "week") {
      const start = startOfWeek(current, { weekStartsOn: 1 });
      const end = endOfWeek(current, { weekStartsOn: 1 });
      return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
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
            {(["day", "week", "month"] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  view === v ? "bg-blue text-white" : "text-secondary"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      {/* Navigation row */}
      <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
        <button
          onClick={goBack}
          className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded-lg text-primary active:opacity-70"
        >
          ←
        </button>
        <button
          onClick={() => setCurrent(new Date())}
          className="px-3 h-8 flex items-center justify-center bg-card border border-border rounded-lg text-primary text-sm font-medium active:opacity-70"
        >
          Today
        </button>
        <button
          onClick={goForward}
          className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded-lg text-primary active:opacity-70"
        >
          →
        </button>
        <span className="text-primary text-sm font-medium ml-1">{navLabel()}</span>
        <div className="flex-1" />
        <button onClick={() => fullSync(true)} disabled={isSyncing}
          className="text-xs text-blue border border-blue/30 rounded-lg px-2.5 py-1 active:opacity-70">
          {isSyncing ? "…" : "↻"}
        </button>
      </div>

      {/* Calendar views */}
      {view === "month" && (
        <MonthView
          current={current}
          workouts={workouts}
          onDayClick={day => { setCurrent(day); setView("day"); }}
          onWorkoutClick={handleWorkoutClick}
        />
      )}
      {view === "week" && (
        <WeekView
          current={current}
          workouts={workouts}
          onDayClick={day => { setCurrent(day); setView("day"); }}
          onWorkoutClick={handleWorkoutClick}
        />
      )}
      {view === "day" && (
        <DayView
          current={current}
          workouts={workouts}
          onWorkoutClick={handleWorkoutClick}
        />
      )}
    </div>
  );
}
