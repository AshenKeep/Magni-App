/**
 * src/db/index.ts
 *
 * Local database using Dexie.js (IndexedDB wrapper).
 * All data is stored on-device and synced to the server when online.
 */

import Dexie, { type Table } from "dexie";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  muscleGroups: string | null;
  equipment: string | null;
  gifUrl: string | null;
  source: string | null;
  createdAt: string;
  syncedAt: string;
}

export interface Template {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
  syncedAt: string;
}

export interface TemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  logType: string;
  order: number;
  notes: string | null;
  syncedAt: string;
}

export interface TemplateSet {
  id: string;
  templateExerciseId: string;
  setNumber: number;
  logType: string;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSeconds: number | null;
  targetDistanceM: number | null;
  notes: string | null;
}

export interface Workout {
  id: string;
  title: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  isLocal: boolean;   // true = not yet pushed to server
  dirty: boolean;     // true = has unpushed changes
  syncedAt: string | null;
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  logType: string;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceM: number | null;
  isDone: boolean;
  rpe: number | null;
  notes: string | null;
  loggedAt: string;
  dirty: boolean;
}

export interface HealthDay {
  date: string;          // YYYY-MM-DD — primary key
  steps: number | null;
  activeCalories: number | null;
  restingHr: number | null;
  sleepHours: number | null;
  activeMinutes: number | null;
  source: "health_connect" | "server";
  syncedAt: string;
}

export interface SyncQueueItem {
  id?: number;           // autoincrement
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body: string | null;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: string;
}

// ─── Database class ──────────────────────────────────────────────────────────

class MagniDatabase extends Dexie {
  exercises!:        Table<Exercise>;
  templates!:        Table<Template>;
  templateExercises!: Table<TemplateExercise>;
  templateSets!:     Table<TemplateSet>;
  workouts!:         Table<Workout>;
  workoutSets!:      Table<WorkoutSet>;
  healthDays!:       Table<HealthDay>;
  syncQueue!:        Table<SyncQueueItem>;
  settings!:         Table<Setting>;

  constructor() {
    super("MagniDB");

    this.version(1).stores({
      exercises:         "id, name, muscleGroup, syncedAt",
      templates:         "id, name, syncedAt",
      templateExercises: "id, templateId, exerciseId",
      templateSets:      "id, templateExerciseId",
      workouts:          "id, startedAt, endedAt, dirty, isLocal",
      workoutSets:       "id, workoutId, exerciseId, dirty",
      healthDays:        "date, syncedAt",
      syncQueue:         "++id, createdAt",
      settings:          "key",
    });
  }
}

export const db = new MagniDatabase();

// ─── Setting helpers ─────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.settings.get(key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}
