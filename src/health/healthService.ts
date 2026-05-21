/**
 * src/health/healthService.ts
 * Reads health data from Android Health Connect and pushes to the Magni server.
 *
 * Confirmed API for @devmaxime/capacitor-health-connect:
 *   checkAvailability()                            → { availability: string }
 *   requestPermissions({ read: [...], write: [] }) → PermissionsResponse
 *   readRecords({ type, start, end })              → { records: any[] }
 *
 * Server endpoint: POST /api/stats/daily
 *   { date, steps, active_calories, resting_hr, sleep_seconds, active_minutes }
 */

import { HealthConnect } from "@devmaxime/capacitor-health-connect";
import { db } from "@/db";
import { statsApi } from "@/api/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HC = HealthConnect as any;

const READ_TYPES = ["Steps", "HeartRate", "SleepSession", "ActiveCaloriesBurned"];

export async function isHealthConnectAvailable(): Promise<boolean> {
  try {
    const result = await HC.checkAvailability();
    // Handle both { availability: "Available" } and direct string response
    const val = result?.availability ?? result;
    return val === "Available";
  } catch {
    return false;
  }
}

export async function requestPermissions(): Promise<boolean> {
  try {
    const result = await HC.requestPermissions({
      read: READ_TYPES,
      write: [],
    });
    const granted = result?.grantedPermissions ?? result?.granted ?? [];
    return Array.isArray(granted) ? granted.length > 0 : !!granted;
  } catch (e) {
    console.error("[Health] requestPermissions failed:", e);
    return false;
  }
}

export async function syncHealthData(days = 7): Promise<void> {
  const available = await isHealthConnectAvailable();
  if (!available) {
    console.log("[Health] Health Connect not available on this device");
    return;
  }

  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = subDays(now, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();

    let steps: number | null = null;
    let restingHr: number | null = null;
    let activeCalories: number | null = null;
    let sleepHours: number | null = null;

    try {
      const r = await HC.readRecords({ type: "Steps", start, end });
      const total = (r?.records ?? []).reduce((s: number, x: any) => s + (x.count ?? 0), 0);
      steps = total > 0 ? total : null;
    } catch { /* permission not granted */ }

    try {
      const r = await HC.readRecords({ type: "HeartRate", start, end });
      const samples = (r?.records ?? []).flatMap((x: any) => x.samples ?? []);
      if (samples.length > 0) {
        restingHr = Math.round(
          samples.reduce((s: number, x: any) => s + (x.beatsPerMinute ?? x.bpm ?? 0), 0) / samples.length
        );
      }
    } catch { /* permission not granted */ }

    try {
      const r = await HC.readRecords({ type: "ActiveCaloriesBurned", start, end });
      const total = (r?.records ?? []).reduce((s: number, x: any) =>
        s + (x.energy?.inKilocalories ?? x.kilocalories ?? 0), 0);
      if (total > 0) activeCalories = Math.round(total);
    } catch { /* permission not granted */ }

    try {
      const r = await HC.readRecords({ type: "SleepSession", start, end });
      const totalMs = (r?.records ?? []).reduce((s: number, x: any) => {
        return s + (new Date(x.endTime).getTime() - new Date(x.startTime).getTime());
      }, 0);
      if (totalMs > 0) sleepHours = Math.round((totalMs / 3600000) * 10) / 10;
    } catch { /* permission not granted */ }

    // Save to local IndexedDB
    await db.healthDays.put({
      date: dateStr,
      steps,
      activeCalories,
      restingHr,
      sleepHours,
      activeMinutes: null,
      source: "health_connect",
      syncedAt: new Date().toISOString(),
    });

    // Push to server — so web portal Activity tab shows the data
    try {
      await statsApi.upsertDaily({
        date: dateStr,
        steps,
        active_calories: activeCalories,
        resting_hr: restingHr,
        sleep_seconds: sleepHours != null ? Math.round(sleepHours * 3600) : null,
        active_minutes: null,
      });
    } catch (e) {
      console.warn(`[Health] Failed to push ${dateStr} to server:`, e);
    }
  }

  console.log(`[Health] Synced ${days} days from Health Connect → local DB + server`);
}
