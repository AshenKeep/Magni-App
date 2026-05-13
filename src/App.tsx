import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen } from "@capacitor/splash-screen";
import { useAppStore } from "@/store/appStore";
import { deltaSync } from "@/sync/syncService";
import { LoginPage } from "@/components/screens/LoginPage";
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

function AuthGate() {
  const { token, isLoading } = useAppStore();
  if (isLoading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <TabLayout />;
}

export function App() {
  const hydrate = useAppStore(s => s.hydrate);

  useEffect(() => {
    (async () => {
      await hydrate();
      await SplashScreen.hide();
      deltaSync().catch(console.warn);
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthGate />}>
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
