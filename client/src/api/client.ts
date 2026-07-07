export const API_BASE = "/api";

const TOKEN_KEY = "ch_token";
const YUQUE_TOKEN_KEY = "yuque_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getYuqueToken(): string | null {
  return localStorage.getItem(YUQUE_TOKEN_KEY);
}

const TRILIUM_URL_KEY = "trilium_url";
const TRILIUM_TOKEN_KEY = "trilium_token";

export function getTriliumUrl(): string | null {
  return localStorage.getItem(TRILIUM_URL_KEY);
}

export function setTriliumUrl(t: string | null) {
  if (t) localStorage.setItem(TRILIUM_URL_KEY, t);
  else localStorage.removeItem(TRILIUM_URL_KEY);
}

export function getTriliumToken(): string | null {
  return localStorage.getItem(TRILIUM_TOKEN_KEY);
}

export function setTriliumToken(t: string | null) {
  if (t) localStorage.setItem(TRILIUM_TOKEN_KEY, t);
  else localStorage.removeItem(TRILIUM_TOKEN_KEY);
}

export function setYuqueToken(t: string | null) {
  if (t) localStorage.setItem(YUQUE_TOKEN_KEY, t);
  else localStorage.removeItem(YUQUE_TOKEN_KEY);
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

/** Fetch with Yuque token header */
async function yuqueFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const yuqueToken = getYuqueToken();
  if (!yuqueToken) throw new Error("未连接语雀");
  const headers = new Headers(init.headers || {});
  headers.set("X-Yuque-Token", yuqueToken);
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as any;
  return res.json();
}

/** Fetch with Trilium headers */
async function triliumFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const triliumUrl = getTriliumUrl();
  const triliumToken = getTriliumToken();
  if (!triliumUrl || !triliumToken) throw new Error("未连接 Trilium");
  const headers = new Headers(init.headers || {});
  headers.set("X-Trilium-Url", triliumUrl);
  headers.set("X-Trilium-Token", triliumToken);
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as any;
  return res.json();
}

export const api = {
  // ===== Auth =====
  login: (username: string, password: string) =>
    apiFetch<any>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string) =>
    apiFetch<any>("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => apiFetch<any>("/auth/me"),

  // ===== Courses =====
  listCourses: () => apiFetch<any[]>("/courses/"),
  getCourse: (id: number) => apiFetch<any>(`/courses/${id}`),
  createCourse: (data: any) => apiFetch("/courses/", { method: "POST", body: JSON.stringify(data) }),
  deleteCourse: (id: number) => apiFetch(`/courses/${id}`, { method: "DELETE" }),

  // ===== Notebooks =====
  listNotebooks: () => apiFetch<any[]>("/notebooks/"),
  getNotebook: (id: number) => apiFetch<any>(`/notebooks/${id}`),
  createNotebook: (data: any) => apiFetch("/notebooks/", { method: "POST", body: JSON.stringify(data) }),
  deleteNotebook: (id: number) => apiFetch(`/notebooks/${id}`, { method: "DELETE" }),

  // ===== Docs =====
  listDocs: (nbId: number) => apiFetch<any[]>(`/notebooks/${nbId}/docs`),
  getDoc: (id: number) => apiFetch<any>(`/notebooks/docs/${id}`),
  createDoc: (nbId: number, data: any) => apiFetch(`/notebooks/${nbId}/docs`, { method: "POST", body: JSON.stringify(data) }),
  updateDoc: (id: number, data: any) => apiFetch(`/notebooks/docs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDoc: (id: number) => apiFetch(`/notebooks/docs/${id}`, { method: "DELETE" }),

  // ===== Explore (Public) =====
  exploreNotebooks: () => apiFetch<any[]>("/explore/notebooks"),
  exploreDocs: (tagId?: number) => {
    const q = tagId ? `?tag_id=${tagId}` : "";
    return apiFetch<any[]>(`/explore/docs${q}`);
  },

  // ===== Tags =====
  listTags: () => apiFetch<any[]>("/tags/"),
  createTag: (data: { name: string; color?: string }) => apiFetch("/tags/", { method: "POST", body: JSON.stringify(data) }),
  deleteTag: (id: number) => apiFetch(`/tags/${id}`, { method: "DELETE" }),

  // ===== Posts (Forum) =====
  listPosts: (params: any = {}) => {
    const q = new URLSearchParams();
    if (params.sort) q.set("sort", params.sort);
    if (params.course_id) q.set("course_id", String(params.course_id));
    if (params.tag_id) q.set("tag_id", String(params.tag_id));
    if (params.page) q.set("page", String(params.page));
    if (params.page_size) q.set("page_size", String(params.page_size));
    return apiFetch<any[]>(`/posts/?${q.toString()}`);
  },
  createPost: (data: any) => apiFetch("/posts/", { method: "POST", body: JSON.stringify(data) }),
  getPost: (id: number) => apiFetch<any>(`/posts/${id}`),
  updatePost: (id: number, data: any) => apiFetch(`/posts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePost: (id: number) => apiFetch(`/posts/${id}`, { method: "DELETE" }),
  votePost: (id: number, value: number = 1) => apiFetch(`/posts/${id}/vote?value=${value}`, { method: "POST" }),
  relatedPosts: (id: number) => apiFetch<any[]>(`/posts/${id}/related`),

  // ===== Comments =====
  listComments: (postId: number) => apiFetch<any[]>(`/comments/?post_id=${postId}`),
  createComment: (data: any) => apiFetch("/comments/", { method: "POST", body: JSON.stringify(data) }),
  deleteComment: (id: number) => apiFetch(`/comments/${id}`, { method: "DELETE" }),

  // ===== Materials =====
  listMaterials: (courseId: number) => apiFetch<any[]>(`/materials/course/${courseId}`),
  uploadMaterial: (courseId: number, file: File, type = "other") => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch(`/materials/course/${courseId}?type=${encodeURIComponent(type)}`, { method: "POST", body: fd });
  },
  deleteMaterial: (id: number) => apiFetch(`/materials/${id}`, { method: "DELETE" }),

  // ===== Chat =====
  listSessions: () => apiFetch<any[]>("/chat/sessions"),
  createSession: (courseId: number | null, title = "新对话") => apiFetch(`/chat/sessions?course_id=${courseId ?? ""}&title=${encodeURIComponent(title)}`, { method: "POST" }),
  listMessages: (sid: number) => apiFetch<any[]>(`/chat/sessions/${sid}/messages`),
  publishSession: (sessionId: number, title: string, tagIds: string = "") => apiFetch<any>(`/chat/sessions/${sessionId}/publish?title=${encodeURIComponent(title)}&tag_ids=${tagIds}`, { method: "POST" }),
  sessionRelatedPosts: (sessionId: number) => apiFetch<any[]>(`/chat/sessions/${sessionId}/related`),
  sendMessage: (sid: number, content: string) => apiFetch<any>(`/chat/sessions/${sid}/messages`, { method: "POST", body: JSON.stringify({ content }) }),

  // ===== Plans =====
  listPlans: () => apiFetch<any[]>("/plans/"),
  createPlan: (data: any) => apiFetch("/plans/", { method: "POST", body: JSON.stringify(data) }),
  deletePlan: (id: number) => apiFetch(`/plans/${id}`, { method: "DELETE" }),

  // ===== Tasks =====
  listTasks: () => apiFetch<any[]>("/tasks/"),
  createTask: (data: any) => apiFetch("/tasks/", { method: "POST", body: JSON.stringify(data) }),
  toggleTask: (id: number, done: boolean) => apiFetch(`/tasks/${id}/done?done=${done}`, { method: "PATCH" }),
  deleteTask: (id: number) => apiFetch(`/tasks/${id}`, { method: "DELETE" }),

  // ===== Dashboard =====
  getDashboard: () => apiFetch<any>("/dashboard/"),

  // ===== Knowledge Base (Trilium-style) =====
  shareNote: (id: string) => apiFetch<any>("/kb/notes/" + id + "/share"),
  unshareNote: (id: string) => apiFetch<any>("/kb/notes/" + id + "/unshare"),
  getSharedNote: (token: string) => apiFetch<any>("/public/notes/" + token),
  kb: {
    roots: () => apiFetch<any[]>("/kb/roots"),
    getNote: (noteId: string) => apiFetch<any>(`/kb/notes/${noteId}`),
    getNoteContent: (noteId: string) => apiFetch<any>(`/kb/notes/${noteId}/content`),
    getNoteTree: (noteId: string) => apiFetch<any[]>(`/kb/notes/${noteId}/tree`),
    createNote: (parentNoteId: string, title: string, content: string = "", type: string = "text", mime: string = "text/html") =>
      apiFetch<any>("/kb/notes", { method: "POST", body: JSON.stringify({ parent_note_id: parentNoteId, title, content, type, mime }) }),
    updateContent: (noteId: string, data: any) =>
      apiFetch<any>(`/kb/notes/${noteId}/content`, { method: "PUT", body: JSON.stringify(data) }),
    deleteNote: (noteId: string) => apiFetch(`/kb/notes/${noteId}`, { method: "DELETE" }),
    moveNote: (noteId: string, parentNoteId: string, notePosition: number = 0) =>
      apiFetch<any>(`/kb/notes/${noteId}/move?parent_note_id=${parentNoteId}&note_position=${notePosition}`, { method: "PATCH" }),
    search: (query: string) => apiFetch<any[]>(`/kb/search?query=${encodeURIComponent(query)}`),
    getAttributes: (noteId: string) => apiFetch<any[]>(`/kb/notes/${noteId}/attributes`),
    createAttribute: (noteId: string, name: string, value: string = "", type: string = "label") =>
      apiFetch<any>("/kb/attributes", { method: "POST", body: JSON.stringify({ note_id: noteId, name, value, type }) }),
    getRevisions: (noteId: string) => apiFetch<any[]>(`/kb/notes/${noteId}/revisions`),
    trash: () => apiFetch<any[]>("/kb/trash"),
    restoreNote: (noteId: string) => apiFetch<any>(`/kb/notes/${noteId}/restore`, { method: "POST" }),
  },

  // ===== 语雀 =====
  yuque: {
    verify: () => yuqueFetch<any>("/yuque/verify", { method: "POST" }),
    listRepos: () => yuqueFetch<any[]>("/yuque/repos"),
    getRepo: (id: number) => yuqueFetch<any>(`/yuque/repos/${id}`),
    createRepo: (data: any) => {
      const params = new URLSearchParams({ name: data.name });
      if (data.description) params.set("description", data.description);
      if (data.slug) params.set("slug", data.slug);
      if (data.public) params.set("public", "true");
      return yuqueFetch<any>(`/yuque/repos?${params}`, { method: "POST" });
    },
    deleteRepo: (id: number) => yuqueFetch(`/yuque/repos/${id}`, { method: "DELETE" }),
    getToc: (repoId: number) => yuqueFetch<any[]>(`/yuque/repos/${repoId}/toc`),
    getDoc: (docId: number) => yuqueFetch<any>(`/yuque/docs/${docId}`),
    createDoc: (repoId: number, data: any) => {
      const params = new URLSearchParams({ title: data.title });
      if (data.body) params.set("body", data.body);
      if (data.format) params.set("format", data.format);
      if (data.slug) params.set("slug", data.slug);
      if (data.public) params.set("public", "true");
      return yuqueFetch<any>(`/yuque/repos/${repoId}/docs?${params}`, { method: "POST" });
    },
    updateDoc: (docId: number, data: any) => {
      const params = new URLSearchParams();
      if (data.title) params.set("title", data.title);
      if (data.body) params.set("body", data.body);
      if (data.public !== undefined) params.set("public", String(data.public));
      return yuqueFetch<any>(`/yuque/docs/${docId}?${params}`, { method: "PUT" });
    },
    deleteDoc: (docId: number) => yuqueFetch(`/yuque/docs/${docId}`, { method: "DELETE" }),
    search: (q: string, repoId?: number) => {
      const params = new URLSearchParams({ q });
      if (repoId) params.set("repo_id", String(repoId));
      return yuqueFetch<any[]>(`/yuque/search?${params}`);
    },
  },

  // ===== Trilium =====
  trilium: {
    verify: () => triliumFetch<any>("/trilium/verify", { method: "POST" }),
    rootChildren: () => triliumFetch<any[]>("/trilium/root/children"),
    getNote: (id: string) => triliumFetch<any>(`/trilium/notes/${id}`),
    getNoteContent: (id: string) => triliumFetch<any>(`/trilium/notes/${id}/content`),
    getNoteTree: (id: string, depth?: number) => {
      const params = depth ? `?depth=${depth}` : "";
      return triliumFetch<any[]>(`/trilium/notes/${id}/tree${params}`);
    },
    createNote: (parentId: string, title: string, content: string = "", type: string = "text", mime?: string) => {
      const params = new URLSearchParams({ parent_note_id: parentId, title, content, type });
      if (mime) params.set("mime", mime);
      return triliumFetch<any>(`/trilium/notes?${params}`, { method: "POST" });
    },
    updateContent: (id: string, content: string, title: string = "") => {
      const params = new URLSearchParams({ content });
      if (title) params.set("title", title);
      return triliumFetch<any>(`/trilium/notes/${id}/content?${params}`, { method: "PUT" });
    },
    patchNote: (id: string, data: any) =>
      triliumFetch<any>(`/trilium/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteNote: (id: string) => triliumFetch(`/trilium/notes/${id}`, { method: "DELETE" }),
    search: (q: string) => triliumFetch<any[]>(`/trilium/search?query=${encodeURIComponent(q)}`),
    createBranch: (noteId: string, parentNoteId: string, notePosition?: number, prefix?: string) => {
      const params = new URLSearchParams({ note_id: noteId, parent_note_id: parentNoteId });
      if (notePosition !== undefined) params.set("note_position", String(notePosition));
      if (prefix) params.set("prefix", prefix);
      return triliumFetch<any>(`/trilium/branches?${params}`, { method: "POST" });
    },
  },
};