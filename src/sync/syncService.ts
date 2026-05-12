/**
 * src/sync/syncService.ts
 * Handles syncing between local IndexedDB and the Magni server.
 *
 * - Full sync:  downloads everything (first run or forced)
 * - Delta sync: only fetches workouts changed since lastDeltaSync
 * - WiFi-only:  skips sync on mobile data unless forced
 * - Queue:      offline mutations replay on next sync
 */

import { Network } from "@capacitor/network";
import { exercisesApi, templatesApi, workoutsApi, type ServerWorkout, type ServerTemplate, type ServerExercise } from "@/api/client";
import { db, setSetting, getSetting } from "@/db";
import { useAppStore } from "@/store/appStore";

// ─── Network check ───────────────────────────────────────────────────────────

async function canSync(force = false): Promise<boolean> {
  const { wifiOnly, token, serverUrl } = useAppStore.getState();
  if (!token || !serverUrl) return false;
  if (force) return true;

  const status = await Network.getStatus();
  if (!status.connected) return false;

  if (wifiOnly && status.connectionType !== "wifi") {
    console.log("[Sync] Skipping — not on WiFi");
    return false;
  }
  return true;
}

// ─── Write helpers ───────────────────────────────────────────────────────────

async function upsertExercises(exercises: ServerExercise[]) {
  const now = new Date().toISOString();
  await db.exercises.bulkPut(exercises.map(e => ({
    id: e.id, name: e.name, muscleGroup: e.muscle_group,
    muscleGroups: e.muscle_groups, equipment: e.equipment,
    gifUrl: e.gif_url, source: e.source,
    createdAt: e.created_at, syncedAt: now,
  })));
}

async function upsertTemplates(templates: ServerTemplate[]) {
  const now = new Date().toISOString();
  for (const t of templates) {
    await db.templates.put({ id: t.id, name: t.name, notes: t.notes, createdAt: t.created_at, syncedAt: now });
    await db.templateExercises.where("templateId").equals(t.id).delete();
    for (const te of t.exercises) {
      await db.templateExercises.put({
        id: te.id, templateId: t.id, exerciseId: te.exercise_id,
        logType: te.log_type, order: te.order, notes: te.notes, syncedAt: now,
      });
      await db.templateSets.bulkPut(te.sets.map(s => ({
        id: s.id, templateExerciseId: te.id, setNumber: s.set_number,
        logType: s.log_type, targetReps: s.target_reps,
        targetWeightKg: s.target_weight_kg,
        targetDurationSeconds: s.target_duration_seconds,
        targetDistanceM: s.target_distance_m, notes: s.notes,
      })));
    }
  }
}

async function upsertWorkouts(workouts: ServerWorkout[]) {
  const now = new Date().toISOString();
  for (const w of workouts) {
    const existing = await db.workouts.get(w.id);
    if (existing?.dirty) continue;  // don't overwrite local changes
    await db.workouts.put({
      id: w.id, title: w.title, startedAt: w.started_at,
      endedAt: w.ended_at, durationSeconds: w.duration_seconds,
      notes: w.notes, isLocal: false, dirty: false, syncedAt: now,
    });
    for (const s of w.sets) {
      const existingSet = await db.workoutSets.get(s.id);
      if (existingSet?.dirty) continue;
      await db.workoutSets.put({
        id: s.id, workoutId: w.id, exerciseId: s.exercise_id,
        setNumber: s.set_number, logType: s.log_type,
        reps: s.reps, weightKg: s.weight_kg,
        durationSeconds: s.duration_seconds, distanceM: s.distance_m,
        isDone: s.is_done, rpe: s.rpe, notes: s.notes,
        loggedAt: s.logged_at, dirty: false,
      });
    }
  }
}

// ─── Push offline queue ───────────────────────────────────────────────────────

async function pushQueue() {
  const { token, serverUrl } = useAppStore.getState();
  if (!token || !serverUrl) return;

  const items = await db.syncQueue.orderBy("id").toArray();
  for (const item of items) {
    try {
      const res = await fetch(`${serverUrl}/api${item.path}`, {
        method: item.method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: item.body ?? undefined,
      });
      if (res.ok || res.status === 404) {
        await db.syncQueue.delete(item.id!);
      } else {
        break;  // stop on first failure, retry next sync
      }
    } catch { break; }
  }
}

// ─── Main sync functions ──────────────────────────────────────────────────────

export async function fullSync(force = false): Promise<void> {
  if (!await canSync(force)) return;

  const { setSyncing, setSyncError, setLastFullSync, setLastDeltaSync } = useAppStore.getState();
  setSyncing(true);
  setSyncError(null);

  try {
    await pushQueue();

    const [exercises, templates, workouts] = await Promise.all([
      exercisesApi.list(),
      templatesApi.list(),
      workoutsApi.list({ limit: 200 }),
    ]);

    await upsertExercises(exercises);
    await upsertTemplates(templates);
    await upsertWorkouts(workouts);

    const now = new Date().toISOString();
    setLastFullSync(now);
    setLastDeltaSync(now);

    console.log(`[Sync] Full sync done. ${exercises.length} exercises, ${templates.length} templates, ${workouts.length} workouts`);
  } catch (e) {
    setSyncError(e instanceof Error ? e.message : "Sync failed");
    console.error("[Sync] Full sync failed:", e);
  } finally {
    setSyncing(false);
  }
}

export async function deltaSync(force = false): Promise<void> {
  if (!await canSync(force)) return;

  const { lastDeltaSync } = useAppStore.getState();
  if (!lastDeltaSync) return fullSync(force);

  const { setSyncing, setSyncError, setLastDeltaSync } = useAppStore.getState();
  setSyncing(true);
  setSyncError(null);

  try {
    await pushQueue();
    const workouts = await workoutsApi.list({ from_date: lastDeltaSync, limit: 200 });
    await upsertWorkouts(workouts);
    setLastDeltaSync(new Date().toISOString());
    console.log(`[Sync] Delta sync done. ${workouts.length} workouts updated`);
  } catch (e) {
    setSyncError(e instanceof Error ? e.message : "Sync failed");
  } finally {
    setSyncing(false);
  }
}

export async function queueMutation(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: object
): Promise<void> {
  await db.syncQueue.add({ method, path, body: body ? JSON.stringify(body) : null, createdAt: new Date().toISOString() });
}
