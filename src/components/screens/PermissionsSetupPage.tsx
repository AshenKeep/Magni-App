/**
 * PermissionsSetupPage
 * Shown once on first launch after login.
 * Requests notifications + Health Connect permissions.
 */
import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";
import { LocalNotifications } from "@capacitor/local-notifications";
import { MagniLogo } from "@/components/ui/MagniLogo";
import { isHealthConnectAvailable, requestPermissions as requestHealthPermissions } from "@/health/healthService";

interface PermissionCardProps {
  icon: string;
  title: string;
  description: string;
  granted: boolean;
  onGrant: () => void;
  loading: boolean;
}

function PermissionCard({ icon, title, description, granted, onGrant, loading }: PermissionCardProps) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${granted ? "border-success/50 bg-success/5" : "border-border bg-card"}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-primary font-semibold">{title}</p>
            {granted && <span className="text-success text-sm shrink-0">✓ Granted</span>}
          </div>
          <p className="text-secondary text-sm mt-1">{description}</p>
          {!granted && (
            <button
              onClick={onGrant}
              disabled={loading}
              className="mt-3 btn-primary text-sm py-2 px-4 disabled:opacity-50"
            >
              {loading ? "Requesting…" : "Grant permission"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  onDone: () => void;
}

export function PermissionsSetupPage({ onDone }: Props) {
  const [notifGranted, setNotifGranted] = useState(false);
  const [healthGranted, setHealthGranted] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    isHealthConnectAvailable().then(setHealthAvailable);
  }, []);

  async function handleNotifPermission() {
    setNotifLoading(true);
    try {
      const result = await LocalNotifications.requestPermissions();
      setNotifGranted(result.display === "granted");
    } catch (e) {
      console.warn("Notification permission request failed:", e);
    } finally {
      setNotifLoading(false);
    }
  }

  async function handleHealthPermission() {
    setHealthLoading(true);
    try {
      const granted = await requestHealthPermissions();
      setHealthGranted(granted);
    } catch (e) {
      console.warn("Health permission request failed:", e);
    } finally {
      setHealthLoading(false);
    }
  }

  async function handleDone() {
    await Preferences.set({ key: "magni_permissions_requested", value: "true" });
    onDone();
  }

  return (
    <div className="min-h-full flex flex-col bg-black px-6 py-8" style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}>
      <div className="flex flex-col items-center mb-8">
        <MagniLogo size={56} />
        <h1 className="text-primary text-2xl font-bold mt-4">Let's set up Magni</h1>
        <p className="text-secondary text-sm text-center mt-2">
          Grant these permissions so Magni works at its best. You can change these anytime in Settings.
        </p>
      </div>

      <div className="space-y-3 flex-1">
        <PermissionCard
          icon="🔔"
          title="Notifications"
          description="Shows a notification while your workout is in progress so you can jump back in if you close the app."
          granted={notifGranted}
          onGrant={handleNotifPermission}
          loading={notifLoading}
        />

        {healthAvailable && (
          <PermissionCard
            icon="❤️"
            title="Health Connect"
            description="Reads your steps, heart rate, sleep and calories from Health Connect, where Garmin automatically syncs your data."
            granted={healthGranted}
            onGrant={handleHealthPermission}
            loading={healthLoading}
          />
        )}
      </div>

      <div className="mt-6 space-y-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        <button
          onClick={handleDone}
          className="btn-primary w-full py-4 text-base"
        >
          {(notifGranted && (!healthAvailable || healthGranted)) ? "All set →" : "Continue →"}
        </button>
        <button
          onClick={handleDone}
          className="w-full py-3 text-secondary text-sm active:opacity-70"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
