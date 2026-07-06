export const API_BASE = "/api";

const TOKEN_KEY = "ch_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    window.location.href = "/login";
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as any;
  return res.json();
}

export const api = {
  register: (u: string, p: string) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ username: u, password: p }) }),
  login: (u: string, p: string) =>
    apiFetch<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p }) }),
  me: () => apiFetch<{ id: number; username: string }>("/auth/me"),
  listCourses: () => apiFetch<any[]>("/courses/"),
  createCourse: (data: any) =>
    apiFetch("/courses/", { method: "POST", body: JSON.stringify(data) }),
  getCourse: (id: number) => apiFetch<any>(`/courses/${id}`),
  deleteCourse: (id: number) => apiFetch(`/courses/${id}`, { method: "DELETE" }),
  listMaterials: (courseId: number) => apiFetch<any[]>(`/materials/course/${courseId}`),
  uploadMaterial: (courseId: number, file: File, type = "other") => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch(`/materials/course/${courseId}?type=${encodeURIComponent(type)}`, {
      method: "POST",
      body: fd,
    });
  },
  deleteMaterial: (id: number) => apiFetch(`/materials/${id}`, { method: "DELETE" }),
  listSessions: () => apiFetch<any[]>("/chat/sessions"),
  createSession: (courseId: number | null, title = "新对话") =>
    apiFetch(`/chat/sessions?course_id=${courseId ?? ""}&title=${encodeURIComponent(title)}`, { method: "POST" }),
  listMessages: (sid: number) => apiFetch<any[]>(`/chat/sessions/${sid}/messages`),
  sendMessage: (sid: number, content: string) =>
    apiFetch<any>(`/chat/sessions/${sid}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
  listPlans: () => apiFetch<any[]>("/plans/"),
  createPlan: (data: any) =>
    apiFetch("/plans/", { method: "POST", body: JSON.stringify(data) }),
  deletePlan: (id: number) => apiFetch(`/plans/${id}`, { method: "DELETE" }),
  listTasks: () => apiFetch<any[]>("/tasks/"),
  createTask: (data: any) =>
    apiFetch("/tasks/", { method: "POST", body: JSON.stringify(data) }),
  toggleTask: (id: number, done: boolean) =>
    apiFetch(`/tasks/${id}/done?done=${done}`, { method: "PATCH" }),
  deleteTask: (id: number) => apiFetch(`/tasks/${id}`, { method: "DELETE" }),
  getDashboard: () => apiFetch<any>("/dashboard/"),
};