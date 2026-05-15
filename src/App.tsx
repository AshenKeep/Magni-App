import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen } from "@capacitor/splash-screen";
import { Preferences } from "@capacitor/preferences";
import { useAppStore } from "@/store/appStore";
import { deltaSync } from "@/sync/syncService";
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

export function App() {
  const hydrate = useAppStore(s => s.hydrate);
  const { token, isLoading } = useAppStore();
  const [showPermissions, setShowPermissions] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await hydrate();
      await SplashScreen.hide();

      // Check if permissions setup has been shown before
      const { value } = await Preferences.get({ key: "magni_permissions_requested" });
      if (!value && useAppStore.getState().token) {
        setShowPermissions(true);
      }

      setReady(true);
      deltaSync().catch(console.warn);
    })();
  }, []);

  if (!ready || isLoading) return null;

  // Show permissions setup on first authenticated launch
  if (showPermissions && token) {
    return (
      <PermissionsSetupPage onDone={() => setShowPermissions(false)} />
    );
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
