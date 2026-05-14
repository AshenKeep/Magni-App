import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { fullSync } from "@/sync/syncService";
import { syncHealthData, requestPermissions, isHealthConnectAvailable } from "@/health/healthService";
import { PageHeader } from "@/components/ui/PageHeader";
import { format } from "date-fns";
import pkg from "../../../package.json";

export function SettingsPage() {
  const {
    userName, userEmail, serverUrl, clearAuth,
    wifiOnly, setWifiOnly,
    lastFullSync, lastDeltaSync,
    isSyncing,
  } = useAppStore();

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

  const fmtDate = (ts: string | null) =>
    ts ? format(new Date(ts), "d MMM yyyy · HH:mm") : "Never";

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader title="Settings" />

      <div className="flex-1 overflow-y-auto pb-8">

        {/* Account */}
        <p className="text-secondary text-xs uppercase tracking-wider px-4 mb-2">Account</p>
        <div className="mx-4 mb-5 border border-border rounded-xl bg-card divide-y divide-border/50">
          <div className="px-4 py-3">
            <p className="text-primary font-medium">{userName}</p>
            <p className="text-secondary text-sm">{userEmail}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-secondary text-xs">Server</p>
            <p className="text-primary text-sm break-all mt-0.5">{serverUrl}</p>
          </div>
        </div>

        {/* Sync */}
        <p className="text-secondary text-xs uppercase tracking-wider px-4 mb-2">Sync</p>
        <div className="mx-4 mb-5 border border-border rounded-xl bg-card divide-y divide-border/50">
          {/* WiFi toggle row — no overflow hidden, explicit padding */}
          <div className="px-4 pr-5 py-3 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-primary font-medium">WiFi only</p>
              <p className="text-secondary text-sm">Only sync on WiFi</p>
            </div>
            <button
              onClick={() => setWifiOnly(!wifiOnly)}
              className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${wifiOnly ? "bg-blue" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wifiOnly ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="text-secondary text-xs">Last full sync</p>
            <p className="text-primary text-sm mt-0.5">{fmtDate(lastFullSync)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-secondary text-xs">Last sync</p>
            <p className="text-primary text-sm mt-0.5">{fmtDate(lastDeltaSync)}</p>
          </div>
        </div>

        {/* Health Connect */}
        {healthAvailable && (
          <>
            <p className="text-secondary text-xs uppercase tracking-wider px-4 mb-2">Health Connect</p>
            <div className="mx-4 mb-5 border border-border rounded-xl bg-card px-4 py-3">
              <p className="text-primary font-medium mb-1">Garmin data via Health Connect</p>
              <p className="text-secondary text-sm mb-3">
                Steps, heart rate, sleep and calories from your Garmin via Health Connect.
              </p>
              <button
                onClick={handleHealthSync}
                disabled={healthSyncing}
                className="btn-primary text-sm py-2 disabled:opacity-50"
              >
                {healthSyncing ? "Syncing health data…" : "Sync health data"}
              </button>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="px-4 space-y-3 mb-6">
          <button
            onClick={() => fullSync(true)}
            disabled={isSyncing}
            className="btn-primary w-full disabled:opacity-50"
          >
            {isSyncing ? "Syncing…" : "↻ Force full sync"}
          </button>
          <button
            onClick={() => {
              if (confirm("Sign out? Your local data stays on the device.")) clearAuth();
            }}
            className="w-full border border-danger/30 text-danger font-semibold rounded-xl py-3 active:opacity-70"
          >
            Sign out
          </button>
        </div>

        <p className="text-secondary text-xs text-center">Magni v{pkg.version}</p>
      </div>
    </div>
  );
}
