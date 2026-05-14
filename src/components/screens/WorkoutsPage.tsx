import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db, type Workout } from "@/db";
import { templatesApi, workoutsApi } from "@/api/client";
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

// ─── Workout chip ─────────────────────────────────────────────────────────────

function WorkoutChip({ workout, compact, onClick }: {
  workout: Workout; compact?: boolean; onClick: () => void;
}) {
  const dur = fmtDuration(workout.durationSeconds);
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      className="w-full text-left bg-blue/80 rounded px-1.5 py-0.5 mb-0.5 active:opacity-70">
      <p className="text-white text-[10px] leading-tight truncate font-medium">
        {workout.title || "Workout"}{!compact && dur ? ` · ${dur}` : ""}
      </p>
    </button>
  );
}

// ─── Day panel (slides in on day tap — matches web app) ───────────────────────

function DayPanel({ day, workouts, onClose, onWorkoutClick, onAddTemplate, onStartBlank }: {
  day: Date;
  workouts: Workout[];
  onClose: () => void;
  onWorkoutClick: (id: string) => void;
  onAddTemplate: () => void;
  onStartBlank: () => void;
}) {
  const dayWorkouts = workoutsForDay(workouts, day);

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-card border-t border-border rounded-t-2xl max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="text-primary font-bold text-base">{format(day, "EEEE d MMMM")}</p>
          <button onClick={onClose} className="text-secondary text-xl w-8 h-8 flex items-center justify-center active:opacity-70">×</button>
        </div>

        {/* Workout list for this day */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {dayWorkouts.length === 0 ? (
            <p className="text-secondary text-sm py-2">No workouts scheduled for this day.</p>
          ) : (
            dayWorkouts.map(w => (
              <button key={w.id} onClick={() => onWorkoutClick(w.id)}
                className="w-full card px-4 py-3 flex items-center justify-between text-left active:opacity-70">
                <div>
                  <p className="text-primary font-medium">{w.title || "Workout"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${w.endedAt ? "bg-success" : "bg-warning"}`} />
                    <p className="text-secondary text-sm">
                      {w.endedAt ? (fmtDuration(w.durationSeconds) ?? "Complete") : "In progress"}
                    </p>
                  </div>
                </div>
                <span className="text-secondary text-lg">›</span>
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-border shrink-0 space-y-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          <button onClick={onAddTemplate}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
            <span>📋</span> Add template to this day
          </button>
          <button onClick={onStartBlank}
            className="w-full border border-border rounded-xl py-3.5 text-primary font-semibold flex items-center justify-center gap-2 active:opacity-70">
            <span>▶</span> Start blank workout now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template picker modal ────────────────────────────────────────────────────

function TemplatePickerModal({ day, onClose, onScheduled }: {
  day: Date;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [scheduling, setScheduling] = useState<string | null>(null);
  const templates = useLiveQuery(() => db.templates.orderBy("name").toArray(), []);

  async function handleSchedule(templateId: string) {
    setScheduling(templateId);
    try {
      const { workout_id } = await templatesApi.start(templateId);
      // Set the workout to the selected day (plan ahead)
      const plannedStart = new Date(day);
      plannedStart.setHours(9, 0, 0, 0); // Default 9am
      await db.workouts.update(workout_id, { startedAt: plannedStart.toISOString(), dirty: true });
      onScheduled();
    } catch (e) {
      console.error("Failed to schedule template:", e);
    } finally { setScheduling(null); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="text-primary font-bold">Add template — {format(day, "d MMM")}</p>
          <button onClick={onClose} className="text-secondary text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {!templates || templates.length === 0 ? (
            <p className="text-secondary text-sm text-center py-8">No templates yet — create them on the web app first</p>
          ) : (
            templates.map(t => (
              <div key={t.id} className="card px-4 py-4">
                <p className="text-primary font-semibold">{t.name}</p>
                <button
                  onClick={() => handleSchedule(t.id)}
                  disabled={!!scheduling}
                  className="mt-3 w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {scheduling === t.id ? "Scheduling…" : "📋 Schedule"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({ current, workouts, onDayTap, onWorkoutClick }: {
  current: Date; workouts: Workout[];
  onDayTap: (day: Date) => void;
  onWorkoutClick: (id: string) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(current), { weekStartsOn: 1 }),
  });

  return (
    <div className="flex-1 flex flex-col px-2 pb-2 overflow-hidden">
      <div className="grid grid-cols-7 mb-1">
        {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => (
          <div key={d} className="text-center text-secondary text-[10px] py-1">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 gap-0.5"
        style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}>
        {days.map(day => {
          const dayWorkouts = workoutsForDay(workouts, day);
          const inMonth = isSameMonth(day, current);
          const today = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => onDayTap(day)}
              className={`flex flex-col rounded-lg p-1 text-left min-h-[60px] transition-colors active:opacity-70
                ${today ? "border border-blue" : "border border-transparent"}
                ${inMonth ? "bg-card" : "bg-card/40"}`}>
              <span className={`text-xs font-medium mb-0.5 ${today ? "text-blue" : inMonth ? "text-primary" : "text-secondary"}`}>
                {format(day, "d")}
              </span>
              {dayWorkouts.slice(0, 2).map(w => (
                <WorkoutChip key={w.id} workout={w} compact onClick={() => onWorkoutClick(w.id)} />
              ))}
              {dayWorkouts.length > 2 && <span className="text-[9px] text-secondary">+{dayWorkouts.length - 2}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({ current, workouts, onDayTap, onWorkoutClick }: {
  current: Date; workouts: Workout[];
  onDayTap: (day: Date) => void;
  onWorkoutClick: (id: string) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(current, { weekStartsOn: 1 }),
    end: endOfWeek(current, { weekStartsOn: 1 }),
  });

  return (
    <div className="flex-1 px-2 pb-2 overflow-hidden">
      <div className="grid grid-cols-7 gap-1 h-full">
        {days.map(day => {
          const dayWorkouts = workoutsForDay(workouts, day);
          const today = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => onDayTap(day)}
              className={`flex flex-col rounded-lg p-1.5 text-left bg-card active:opacity-70
                ${today ? "border border-blue" : "border border-transparent"}`}>
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

// ─── Day list view ────────────────────────────────────────────────────────────

function DayListView({ current, workouts, onDayTap, onWorkoutClick }: {
  current: Date; workouts: Workout[];
  onDayTap: (day: Date) => void;
  onWorkoutClick: (id: string) => void;
}) {
  const dayWorkouts = workoutsForDay(workouts, current);
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="flex items-center justify-between py-3">
        <p className="text-secondary text-sm">{format(current, "EEEE d MMMM yyyy")}</p>
        <button onClick={() => onDayTap(current)} className="text-blue text-sm font-medium active:opacity-70">+ Add</button>
      </div>
      {dayWorkouts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-secondary text-sm">No workouts this day</p>
          <button onClick={() => onDayTap(current)} className="btn-primary mt-4 px-6 text-sm">+ Add workout</button>
        </div>
      ) : (
        <div className="space-y-2">
          {dayWorkouts.map(w => (
            <button key={w.id} onClick={() => onWorkoutClick(w.id)}
              className="w-full card px-4 py-3 flex items-center justify-between text-left active:opacity-70">
              <div>
                <p className="text-primary font-medium">{w.title || "Workout"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${w.endedAt ? "bg-success" : "bg-warning"}`} />
                  <p className="text-secondary text-sm">{w.endedAt ? (fmtDuration(w.durationSeconds) ?? "Complete") : "In progress"}</p>
                </div>
              </div>
              <span className="text-secondary text-lg">›</span>
            </button>
          ))}
          <button onClick={() => onDayTap(current)} className="w-full card px-4 py-3 text-blue text-sm font-medium text-center active:opacity-70">
            + Add another
          </button>
        </div>
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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

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

  function handleDayTap(day: Date) {
    setCurrent(day);
    setSelectedDay(day);
  }

  function handleWorkoutClick(id: string) {
    navigate(`/workouts/${id}`);
  }

  async function handleStartBlank() {
    if (!selectedDay) return;
    try {
      const w = await workoutsApi.create({
        title: `Workout ${format(selectedDay, "d MMM")}`,
        started_at: selectedDay.toISOString(),
      });
      await db.workouts.put({
        id: w.id, title: w.title, startedAt: w.started_at,
        endedAt: null, durationSeconds: null, notes: null,
        isLocal: false, dirty: false, syncedAt: new Date().toISOString(),
      });
      setSelectedDay(null);
      navigate(`/workouts/${w.id}`);
    } catch (e) {
      console.error("Failed to create blank workout:", e);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader
        title="Schedule"
        right={
          <div className="flex items-center gap-1">
            {(["Day","Week","Month"] as const).map(v => (
              <button key={v} onClick={() => setView(v.toLowerCase() as View)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  view === v.toLowerCase() ? "bg-blue text-white" : "text-secondary"
                }`}>
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
        <button onClick={() => fullSync(true)} disabled={isSyncing}
          className="text-xs text-blue border border-blue/30 rounded-lg px-2.5 py-1 active:opacity-70 shrink-0">
          {isSyncing ? "…" : "↻"}
        </button>
      </div>

      {view === "month" && <MonthView current={current} workouts={workouts} onDayTap={handleDayTap} onWorkoutClick={handleWorkoutClick} />}
      {view === "week"  && <WeekView  current={current} workouts={workouts} onDayTap={handleDayTap} onWorkoutClick={handleWorkoutClick} />}
      {view === "day"   && <DayListView current={current} workouts={workouts} onDayTap={handleDayTap} onWorkoutClick={handleWorkoutClick} />}

      {/* Day panel */}
      {selectedDay && !showTemplatePicker && (
        <DayPanel
          day={selectedDay}
          workouts={workouts}
          onClose={() => setSelectedDay(null)}
          onWorkoutClick={id => { setSelectedDay(null); handleWorkoutClick(id); }}
          onAddTemplate={() => setShowTemplatePicker(true)}
          onStartBlank={handleStartBlank}
        />
      )}

      {/* Template picker */}
      {selectedDay && showTemplatePicker && (
        <TemplatePickerModal
          day={selectedDay}
          onClose={() => { setShowTemplatePicker(false); setSelectedDay(null); }}
          onScheduled={() => { setShowTemplatePicker(false); setSelectedDay(null); fullSync(true); }}
        />
      )}
    </div>
  );
}
