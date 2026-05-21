import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen } from "@capacitor/splash-screen";
import { Preferences } from "@capacitor/preferences";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useAppStore } from "@/store/appStore";
import { deltaSync } from "@/sync/syncService";
import { isHealthConnectAvailable } from "@/health/healthService";
import { LoginPage } from "@/components/screens/LoginPage";
import { PermissionsSetupPage } from "@/components/screens/PermissionsSetupPage";
import { TabLayout } from "@/components/layout/TabLayout";
import { DashboardPage } from "@/components/screens/DashboardPage";
import { WorkoutsPage } from "@/components/screens/WorkoutsPage";
import { WorkoutLoggerPage } from "@/components/screens/WorkoutLoggerPage";
import { ExercisesPage } from "@/components/screens/ExercisesPage";
import { TemplatesPage } from "@/components/screens/TemplatesPage";
import { ActivityPage } from "@/components/screens/ActivityPage";
import { SettingsPage } from "@/components/screens/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

async function permissionsAlreadyGranted(): Promise<boolean> {
  try {
    // Check notifications
    const notifStatus = await LocalNotifications.checkPermissions();
    if (notifStatus.display !== "granted") return false;

    // Check Health Connect if available
    const hcAvailable = await isHealthConnectAvailable();
    if (!hcAvailable) return true; // HC not available — nothing to grant

    // If HC is available, we can't programmatically check HC permissions
    // so just check if we've ever requested them
    const { value } = await Preferences.get({ key: "magni_permissions_requested" });
    return value === "true";
  } catch {
    return false;
  }
}

export function App() {
  const hydrate = useAppStore(s => s.hydrate);
  const { token, isLoading } = useAppStore();
  const [showPermissions, setShowPermissions] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await hydrate();
      await SplashScreen.hide();

      const { token: tok } = useAppStore.getState();
      if (tok) {
        // Show permissions setup if we haven't run it yet OR if permissions aren't granted
        const alreadyGranted = await permissionsAlreadyGranted();
        if (!alreadyGranted) {
          // Clear the flag so setup page will fire permissions again
          await Preferences.remove({ key: "magni_permissions_requested" });
          setShowPermissions(true);
        }
      }

      setReady(true);
      deltaSync().catch(console.warn);
    })();
  }, []);

  if (!ready || isLoading) return null;

  if (showPermissions && token) {
    return <PermissionsSetupPage onDone={() => setShowPermissions(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={token ? <TabLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<DashboardPage />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="workouts/:id" element={<WorkoutLoggerPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
