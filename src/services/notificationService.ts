/**
 * Manages the "Workout in progress" persistent Android notification.
 * Uses @capacitor/local-notifications.
 *
 * AndroidManifest.xml requires:
 *   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
 */
import { LocalNotifications } from "@capacitor/local-notifications";

const WORKOUT_NOTIFICATION_ID = 1001;

export async function scheduleWorkoutNotification(workoutId: string, title: string): Promise<void> {
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;

    await LocalNotifications.cancel({ notifications: [{ id: WORKOUT_NOTIFICATION_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: WORKOUT_NOTIFICATION_ID,
          title: "Workout in progress",
          body: title,
          ongoing: true,
          autoCancel: false,
          smallIcon: "ic_stat_icon_config_sample",
          extra: { workoutId },
          // Deliver immediately — no scheduled time means now
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
  } catch (e) {
    // Notifications not available on web/emulator — fail silently
    console.warn("[Notifications] Failed to schedule workout notification:", e);
  }
}

export async function cancelWorkoutNotification(): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: WORKOUT_NOTIFICATION_ID }] });
  } catch {
    // Ignore
  }
}
