/**
 * src/health/healthService.ts
 *
 * Reads health data from Android Health Connect.
 * Garmin Connect automatically writes steps, heart rate, sleep etc.
 * into Health Connect — we read from there, no Garmin API needed.
 *
 * Permissions requested:
 * - Steps (read)
 * - Heart rate (read)
 * - Sleep (read)
 * - Active calories burned (read)
 * - Exercise sessions (read)
 */

import HealthConnect, {
  type HealthConnectRecord,
} from "@capacitor-community/health-connect";
import { db } from "@/db";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const PERMISSIONS = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "SleepSession" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "TotalCaloriesBurned" },
] as const;

/** Check if Health Connect is available on this device */
export async function isHealthConnectAvailable(): Promise<boolean> {
  try {
    const { result } = await HealthConnect.checkAvailability();
    return result === "Available";
  } catch {
    return false;
  }
}

/** Request Health Connect permissions from the user */
export async function requestPermissions(): Promise<boolean> {
  try {
    const { grantedPermissions } = await HealthConnect.requestHealthPermissions({
      // @ts-ignore — type mismatch in plugin types
      permissions: PERMISSIONS,
    });
    return grantedPermissions.length > 0;
  } catch (e) {
    console.error("[Health] Permission request failed:", e);
    return false;
  }
}

/** Read and store the last N days of health data */
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

    try {
      // Steps
      let steps: number | null = null;
      try {
        const stepsResult = await HealthConnect.readRecords({
          type: "Steps",
          timeRangeFilter: { operator: "between", startTime: start, endTime: end },
        });
        steps = (stepsResult.records as any[]).reduce((sum: number, r: any) => sum + (r.count ?? 0), 0) || null;
      } catch { /* permission not granted */ }

      // Resting heart rate (average of samples)
      let restingHr: number | null = null;
      try {
        const hrResult = await HealthConnect.readRecords({
          type: "HeartRate",
          timeRangeFilter: { operator: "between", startTime: start, endTime: end },
        });
        const samples = (hrResult.records as any[]).flatMap((r: any) => r.samples ?? []);
        if (samples.length > 0) {
          const avg = samples.reduce((s: number, x: any) => s + x.beatsPerMinute, 0) / samples.length;
          restingHr = Math.round(avg);
        }
      } catch { /* permission not granted */ }

      // Active calories
      let activeCalories: number | null = null;
      try {
        const calResult = await HealthConnect.readRecords({
          type: "ActiveCaloriesBurned",
          timeRangeFilter: { operator: "between", startTime: start, endTime: end },
        });
        const total = (calResult.records as any[]).reduce((s: number, r: any) => s + (r.energy?.inKilocalories ?? 0), 0);
        if (total > 0) activeCalories = Math.round(total);
      } catch { /* permission not granted */ }

      // Sleep
      let sleepHours: number | null = null;
      try {
        const sleepResult = await HealthConnect.readRecords({
          type: "SleepSession",
          timeRangeFilter: { operator: "between", startTime: start, endTime: end },
        });
        const totalMs = (sleepResult.records as any[]).reduce((s: number, r: any) => {
          const ms = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
          return s + ms;
        }, 0);
        if (totalMs > 0) sleepHours = Math.round((totalMs / 3600000) * 10) / 10;
      } catch { /* permission not granted */ }

      // Save to local DB
      await db.healthDays.put({
        date: dateStr,
        steps,
        activeCalories,
        restingHr,
        sleepHours,
        activeMinutes: null,   // derive from exercise sessions if needed
        source: "health_connect",
        syncedAt: new Date().toISOString(),
      });

    } catch (e) {
      console.warn(`[Health] Failed to read data for ${dateStr}:`, e);
    }
  }

  console.log(`[Health] Synced ${days} days of Health Connect data`);
}
