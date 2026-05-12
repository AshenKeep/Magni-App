/**
 * src/api/client.ts
 * HTTP client for the Magni server REST API.
 */

import { useAppStore } from "@/store/appStore";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { serverUrl, token, clearAuth } = useAppStore.getState();
  if (!serverUrl) throw new ApiError(0, "No server URL configured");

  const res = await fetch(`${serverUrl}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    await clearAuth();
    throw new ApiError(401, "Session expired — please log in again");
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({ detail: "Request failed" }));
  if (!res.ok) throw new ApiError(res.status, json.detail ?? "Unknown error");
  return json as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  setupRequired: () => request<{ required: boolean }>("/auth/setup-required"),
  setup:  (email: string, password: string, display_name: string) =>
    request<{ access_token: string }>("/auth/setup", { method: "POST", body: JSON.stringify({ email, password, display_name }) }),
  login:  (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me:     () => request<{ id: string; email: string; display_name: string }>("/auth/me"),
};

// ─── Workouts ────────────────────────────────────────────────────────────────

export const workoutsApi = {
  list: (params?: { limit?: number; from_date?: string; to_date?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit)     qs.set("limit", String(params.limit));
    if (params?.from_date) qs.set("from_date", params.from_date);
    if (params?.to_date)   qs.set("to_date", params.to_date);
    return request<ServerWorkout[]>(`/workouts/?${qs}`);
  },
  create: (body: Partial<ServerWorkout>) =>
    request<ServerWorkout>("/workouts/", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<ServerWorkout>) =>
    request<ServerWorkout>(`/workouts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<void>(`/workouts/${id}`, { method: "DELETE" }),
  addSet: (workoutId: string, body: Partial<ServerSet>) =>
    request<ServerSet>(`/workouts/${workoutId}/sets`, { method: "POST", body: JSON.stringify(body) }),
  updateSet: (workoutId: string, setId: string, body: Partial<ServerSet>) =>
    request<ServerSet>(`/workouts/${workoutId}/sets/${setId}`, { method: "PATCH", body: JSON.stringify(body) }),
};

export const templatesApi = {
  list:  () => request<ServerTemplate[]>("/templates/"),
  start: (id: string) => request<{ workout_id: string }>(`/templates/${id}/start`, { method: "POST" }),
};

export const exercisesApi = {
  list: () => request<ServerExercise[]>("/exercises/?limit=500"),
};

export const statsApi = {
  dashboard: () => request<ServerDashboard>("/stats/dashboard"),
};

// ─── Server types ─────────────────────────────────────────────────────────────

export interface ServerWorkout {
  id: string; title: string | null; started_at: string; ended_at: string | null;
  duration_seconds: number | null; notes: string | null;
  sets: ServerSet[];
}
export interface ServerSet {
  id: string; exercise_id: string; set_number: number; log_type: string;
  reps: number | null; weight_kg: number | null; duration_seconds: number | null;
  distance_m: number | null; is_done: boolean; rpe: number | null;
  notes: string | null; logged_at: string;
}
export interface ServerTemplate {
  id: string; name: string; notes: string | null; created_at: string;
  exercises: ServerTemplateExercise[];
}
export interface ServerTemplateExercise {
  id: string; exercise_id: string; log_type: string; order: number; notes: string | null;
  sets: ServerTemplateSet[];
}
export interface ServerTemplateSet {
  id: string; set_number: number; log_type: string;
  target_reps: number | null; target_weight_kg: number | null;
  target_duration_seconds: number | null; target_distance_m: number | null; notes: string | null;
}
export interface ServerExercise {
  id: string; name: string; muscle_group: string | null; muscle_groups: string | null;
  equipment: string | null; gif_url: string | null; source: string | null; created_at: string;
}
export interface ServerDashboard {
  total_workouts: number; workouts_this_week: number;
  current_streak_days: number; avg_workout_duration_seconds: number | null;
}
