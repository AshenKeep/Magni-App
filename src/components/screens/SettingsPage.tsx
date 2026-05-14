import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { fullSync } from "@/sync/syncService";
import { syncHealthData, requestPermissions, isHealthConnectAvailable } from "@/health/healthService";
import { PageHeader } from "@/components/ui/PageHeader";
import { format } from "date-fns";
import pkg from "../../../package.json";

function SectionLabel({ text }: { text: string }) {
  return <p className="text-secondary text-xs uppercase tracking-wider px-4 mb-2">{text}</p>;
}

function SettingRow({ label, sub, right }: { label: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-primary font-medium">{label}</p>
        {sub && <p className="text-secondary text-sm mt-0.5">{sub}</p>}
      </div>
      {/* right slot has no overflow clipping — toggle thumb won't be cut */}
      {right && <div className="shrink-0 mr-1">{right}</div>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: value ? "#5B7FFF" : "#2A2A2A", position: "relative", transition: "background-color 0.2s", flexShrink: 0 }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: value ? 25 : 3,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

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
      else alert("Health Connect permissions were not granted. Please allow access in Health Connect settings.");
    } finally { setHealthSyncing(false); }
  };

  const fmtDate = (ts: string | null) => ts ? format(new Date(ts), "d MMM yyyy · HH:mm") : "Never";

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <PageHeader title="Settings" />

      <div className="flex-1 overflow-y-auto pb-8">
        <SectionLabel text="Account" />
        <div className="mx-4 mb-5 rounded-xl bg-card border border-border">
          <SettingRow label={userName ?? "—"} sub={userEmail ?? ""} />
          <SettingRow label="Server" sub={serverUrl ?? "Not configured"} />
        </div>

        <SectionLabel text="Sync" />
        <div className="mx-4 mb-5 rounded-xl bg-card border border-border">
          <SettingRow
            label="WiFi only"
            sub="Only sync on WiFi"
            right={<Toggle value={wifiOnly} onChange={setWifiOnly} />}
          />
          <SettingRow label="Last full sync" sub={fmtDate(lastFullSync)} />
          <SettingRow label="Last sync" sub={fmtDate(lastDeltaSync)} />
        </div>

        {healthAvailable && (
          <>
            <SectionLabel text="Health Connect" />
            <div className="mx-4 mb-5 rounded-xl bg-card border border-border px-4 py-4">
              <p className="text-primary font-medium mb-1">Garmin data via Health Connect</p>
              <p className="text-secondary text-sm mb-3">Syncs steps, heart rate, sleep and calories from Garmin via Health Connect. You'll be prompted to grant permissions.</p>
              <button onClick={handleHealthSync} disabled={healthSyncing} className="btn-primary text-sm py-2.5 px-5 disabled:opacity-50">
                {healthSyncing ? "Syncing…" : "Sync health data"}
              </button>
            </div>
          </>
        )}

        <div className="px-4 space-y-3 mb-6">
          <button onClick={() => fullSync(true)} disabled={isSyncing} className="btn-primary w-full py-3.5 disabled:opacity-50">
            {isSyncing ? "Syncing…" : "↻ Force full sync"}
          </button>
          <button
            onClick={() => { if (confirm("Sign out? Your local data stays on this device.")) clearAuth(); }}
            className="w-full border border-danger/30 text-danger font-semibold rounded-xl py-3.5 active:opacity-70"
          >
            Sign out
          </button>
        </div>

        <p className="text-secondary text-xs text-center pb-4">Magni v{pkg.version}</p>
      </div>
    </div>
  );
}
