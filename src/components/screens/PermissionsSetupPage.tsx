/**
 * PermissionsSetupPage
 * Shown on first launch after login AND any time permissions are not yet granted.
 * Triggers permission requests automatically on mount — no button tap required.
 */
import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";
import { LocalNotifications } from "@capacitor/local-notifications";
import { MagniLogo } from "@/components/ui/MagniLogo";
import { isHealthConnectAvailable, requestPermissions as requestHealthPermissions } from "@/health/healthService";

interface Props {
  onDone: () => void;
}

export function PermissionsSetupPage({ onDone }: Props) {
  const [notifStatus, setNotifStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [healthStatus, setHealthStatus] = useState<"pending" | "granted" | "denied" | "unavailable">("pending");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Auto-trigger all permission requests on mount — no tap required
    (async () => {
      // 1. Notifications
      try {
        const result = await LocalNotifications.requestPermissions();
        setNotifStatus(result.display === "granted" ? "granted" : "denied");
      } catch {
        setNotifStatus("denied");
      }

      // 2. Health Connect
      const available = await isHealthConnectAvailable();
      if (!available) {
        setHealthStatus("unavailable");
      } else {
        try {
          const granted = await requestHealthPermissions();
          setHealthStatus(granted ? "granted" : "denied");
        } catch {
          setHealthStatus("denied");
        }
      }

      setDone(true);
    })();
  }, []);

  async function handleContinue() {
    await Preferences.set({ key: "magni_permissions_requested", value: "true" });
    onDone();
  }

  const statusIcon = (s: string) => {
    if (s === "granted") return "✓";
    if (s === "denied") return "✕";
    if (s === "unavailable") return "—";
    return "…";
  };

  const statusColor = (s: string) => {
    if (s === "granted") return "text-success";
    if (s === "denied") return "text-danger";
    if (s === "unavailable") return "text-secondary";
    return "text-blue";
  };

  return (
    <div className="min-h-full flex flex-col bg-black px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}>
      <div className="flex flex-col items-center mb-10">
        <MagniLogo size={56} />
        <h1 className="text-primary text-2xl font-bold mt-4">Setting up Magni</h1>
        <p className="text-secondary text-sm text-center mt-2">
          Requesting the permissions Magni needs. Grant access when your phone prompts you.
        </p>
      </div>

      <div className="space-y-4 flex-1">
        {/* Notifications */}
        <div className="card px-4 py-4 flex items-start gap-4">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-primary font-semibold">Notifications</p>
              <span className={`font-bold ${statusColor(notifStatus)}`}>{statusIcon(notifStatus)}</span>
            </div>
            <p className="text-secondary text-sm mt-0.5">
              Shows a notification while a workout is in progress so you can jump back in.
            </p>
          </div>
        </div>

        {/* Health Connect */}
        <div className="card px-4 py-4 flex items-start gap-4">
          <span className="text-2xl">❤️</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-primary font-semibold">Health Connect</p>
              <span className={`font-bold ${statusColor(healthStatus)}`}>{statusIcon(healthStatus)}</span>
            </div>
            <p className="text-secondary text-sm mt-0.5">
              {healthStatus === "unavailable"
                ? "Health Connect is not available on this device."
                : "Reads your Garmin data — steps, heart rate, sleep and calories."}
            </p>
            {healthStatus === "denied" && (
              <button
                onClick={async () => {
                  try {
                    const granted = await requestHealthPermissions();
                    setHealthStatus(granted ? "granted" : "denied");
                  } catch { /* ignore */ }
                }}
                className="mt-2 text-blue text-sm font-medium active:opacity-70"
              >
                Try again →
              </button>
            )}
          </div>
        </div>

        {/* Waiting indicator */}
        {!done && (
          <p className="text-secondary text-xs text-center mt-4">
            Grant access in the prompts appearing on your screen…
          </p>
        )}
      </div>

      <div className="py-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
        {done && (
          <button onClick={handleContinue} className="btn-primary w-full py-4 text-base">
            {notifStatus === "granted" && (healthStatus === "granted" || healthStatus === "unavailable")
              ? "All set →"
              : "Continue →"}
          </button>
        )}
      </div>
    </div>
  );
}
