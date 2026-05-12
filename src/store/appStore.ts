/**
 * src/store/appStore.ts
 * Global state: auth, server URL, sync preferences.
 * Persisted to Capacitor Preferences (secure on-device storage).
 */

import { create } from "zustand";
import { Preferences } from "@capacitor/preferences";

const KEYS = {
  token:     "magni_token",
  serverUrl: "magni_server_url",
  userId:    "magni_user_id",
  userEmail: "magni_user_email",
  userName:  "magni_user_name",
  wifiOnly:  "magni_wifi_only",
} as const;

interface AppState {
  // Auth
  token:     string | null;
  serverUrl: string | null;
  userId:    string | null;
  userEmail: string | null;
  userName:  string | null;
  isLoading: boolean;

  // Sync prefs
  wifiOnly:      boolean;
  lastFullSync:  string | null;
  lastDeltaSync: string | null;
  isSyncing:     boolean;
  syncError:     string | null;

  // Actions
  hydrate:      () => Promise<void>;
  setAuth:      (token: string, serverUrl: string, user: { id: string; email: string; display_name: string }) => Promise<void>;
  clearAuth:    () => Promise<void>;
  setWifiOnly:  (val: boolean) => Promise<void>;
  setSyncing:   (val: boolean) => void;
  setSyncError: (err: string | null) => void;
  setLastFullSync:  (ts: string) => void;
  setLastDeltaSync: (ts: string) => void;
}

async function get(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value;
}
async function set(key: string, value: string): Promise<void> {
  await Preferences.set({ key, value });
}
async function remove(key: string): Promise<void> {
  await Preferences.remove({ key });
}

export const useAppStore = create<AppState>((setState, getState) => ({
  token: null, serverUrl: null, userId: null, userEmail: null, userName: null,
  isLoading: true, wifiOnly: true, lastFullSync: null, lastDeltaSync: null,
  isSyncing: false, syncError: null,

  hydrate: async () => {
    try {
      const [token, serverUrl, userId, userEmail, userName, wifiOnly, lastFull, lastDelta] =
        await Promise.all([
          get(KEYS.token), get(KEYS.serverUrl), get(KEYS.userId),
          get(KEYS.userEmail), get(KEYS.userName), get(KEYS.wifiOnly),
          get("magni_last_full_sync"), get("magni_last_delta_sync"),
        ]);
      setState({
        token, serverUrl, userId, userEmail, userName,
        wifiOnly: wifiOnly !== "false",
        lastFullSync: lastFull, lastDeltaSync: lastDelta,
        isLoading: false,
      });
    } catch {
      setState({ isLoading: false });
    }
  },

  setAuth: async (token, serverUrl, user) => {
    await Promise.all([
      set(KEYS.token,     token),
      set(KEYS.serverUrl, serverUrl),
      set(KEYS.userId,    user.id),
      set(KEYS.userEmail, user.email),
      set(KEYS.userName,  user.display_name),
    ]);
    setState({ token, serverUrl, userId: user.id, userEmail: user.email, userName: user.display_name });
  },

  clearAuth: async () => {
    await Promise.all(Object.values(KEYS).map(k => remove(k)));
    setState({ token: null, serverUrl: null, userId: null, userEmail: null, userName: null });
  },

  setWifiOnly: async (val) => {
    await set(KEYS.wifiOnly, String(val));
    setState({ wifiOnly: val });
  },

  setSyncing:       (val) => setState({ isSyncing: val }),
  setSyncError:     (err) => setState({ syncError: err }),
  setLastFullSync:  (ts)  => { set("magni_last_full_sync", ts);  setState({ lastFullSync: ts }); },
  setLastDeltaSync: (ts)  => { set("magni_last_delta_sync", ts); setState({ lastDeltaSync: ts }); },
}));
