import { useAppStore } from "@/store/appStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { fullSync } from "@/sync/syncService";
import { syncHealthData, requestPermissions, isHealthConnectAvailable } from "@/health/healthService";
import { useState, useEffect } from "react";
import { format } from "date-fns";

export function SettingsPage() {
  const { userName, userEmail, serverUrl, clearAuth, wifiOnly, setWifiOnly, lastFullSync, lastDeltaSync, isSyncing } = useAppStore();
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);

  useEffect(() => { isHealthConnectAvailable().then(setHealthAvailable); }, []);

  const handleHealthSync = async () => {
    setHealthSyncing(true);
    try {
      const granted = await requestPermissions();
      if (granted) await syncHealthData(14);
    } finally { setHealthSyncing(false); }
  };

  return (
    <div className="p-4 space-y-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <h1 className="text-primary text-xl font-bold">Settings</h1>

      {/* Account */}
      <div>
        <p className="text-secondary text-xs uppercase tracking-wider mb-2">Account</p>
        <div className="card divide-y divide-border/50">
          <div className="px-4 py-3"><p className="text-primary font-medium">{userName}</p><p className="text-secondary text-sm">{userEmail}</p></div>
          <div className="px-4 py-3"><p className="text-secondary text-xs">Server</p><p className="text-primary text-sm break-all">{serverUrl}</p></div>
        </div>
      </div>

      {/* Sync */}
      <div>
        <p className="text-secondary text-xs uppercase tracking-wider mb-2">Sync</p>
        <div className="card divide-y divide-border/50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div><p className="text-primary font-medium">WiFi only</p><p className="text-secondary text-sm">Only sync on WiFi</p></div>
            <button onClick={() => setWifiOnly(!wifiOnly)}
              className={`w-12 h-6 rounded-full transition-colors ${wifiOnly ? "bg-blue" : "bg-muted"} relative`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wifiOnly ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="px-4 py-3"><p className="text-secondary text-xs">Last full sync</p><p className="text-primary text-sm">{lastFullSync ? format(new Date(lastFullSync), "d MMM yyyy · HH:mm") : "Never"}</p></div>
          <div className="px-4 py-3"><p className="text-secondary text-xs">Last sync</p><p className="text-primary text-sm">{lastDeltaSync ? format(new Date(lastDeltaSync), "d MMM yyyy · HH:mm") : "Never"}</p></div>
        </div>
      </div>

      {/* Health Connect */}
      {healthAvailable && (
        <div>
          <p className="text-secondary text-xs uppercase tracking-wider mb-2">Health Connect</p>
          <div className="card px-4 py-3">
            <p className="text-primary font-medium mb-1">Garmin data via Health Connect</p>
            <p className="text-secondary text-sm mb-3">Steps, heart rate, sleep and calories — synced from your Garmin via Health Connect.</p>
            <button onClick={handleHealthSync} disabled={healthSyncing} className="btn-primary text-sm py-2">
              {healthSyncing ? "Syncing health data…" : "Sync health data"}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button onClick={() => fullSync(true)} disabled={isSyncing} className="btn-primary w-full">
          {isSyncing ? "Syncing…" : "↻ Force full sync"}
        </button>
        <button onClick={() => { if (confirm("Sign out? Your local data stays on the device.")) clearAuth(); }}
          className="w-full border border-danger/30 text-danger font-semibold rounded-xl py-3 active:opacity-70">
          Sign out
        </button>
      </div>

      <p className="text-secondary text-xs text-center pb-4">Magni v0.0.3</p>
    </div>
  );
}
