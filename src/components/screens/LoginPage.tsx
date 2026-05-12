import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/client";
import { useAppStore } from "@/store/appStore";
import { fullSync } from "@/sync/syncService";

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAppStore(s => s.setAuth);
  const [mode, setMode] = useState<"loading" | "setup" | "login">("loading");
  const [serverUrl, setServerUrl] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!serverUrl.startsWith("http")) { setMode("loading"); return; }
    const t = setTimeout(async () => {
      try {
        useAppStore.setState({ serverUrl: serverUrl.replace(/\/$/, "") });
        const { required } = await authApi.setupRequired();
        setMode(required ? "setup" : "login");
        setError("");
      } catch {
        setMode("loading");
        setError("Cannot reach server — check the URL");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [serverUrl]);

  const handleSubmit = async () => {
    if (busy) return;
    setError(""); setBusy(true);
    try {
      useAppStore.setState({ serverUrl: serverUrl.replace(/\/$/, "") });
      const res = mode === "setup"
        ? await authApi.setup(email, password, displayName)
        : await authApi.login(email, password);
      useAppStore.setState({ token: res.access_token });
      const user = await authApi.me();
      await setAuth(res.access_token, serverUrl.replace(/\/$/, ""), user);
      fullSync(true).catch(console.warn);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      useAppStore.setState({ serverUrl: null, token: null });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-3xl font-bold">M</span>
          </div>
          <h1 className="text-primary text-2xl font-bold">Magni</h1>
          <p className="text-secondary text-sm mt-1">
            {mode === "setup" ? "Create your account" : mode === "login" ? "Sign in" : "Connect to server"}
          </p>
        </div>

        {error && <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="label">Server URL</label>
            <input type="url" value={serverUrl} onChange={e => setServerUrl(e.target.value)}
              className="input" placeholder="https://your-server:8443" autoCapitalize="none" autoCorrect="off" />
          </div>

          {mode === "loading" && serverUrl.startsWith("http") && (
            <div className="text-center text-secondary text-sm py-2">Connecting…</div>
          )}

          {(mode === "login" || mode === "setup") && (
            <>
              {mode === "setup" && (
                <div>
                  <label className="label">Display name</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" placeholder="Your name" />
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" autoCapitalize="none" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" />
              </div>
              <button onClick={handleSubmit} disabled={busy || !email || !password || (mode === "setup" && !displayName)} className="btn-primary w-full">
                {busy ? "Please wait…" : mode === "setup" ? "Create account" : "Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
