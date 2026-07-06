# -*- coding: utf-8 -*-
import sys, subprocess
sys.stdout.reconfigure(encoding="utf-8")

orig = subprocess.check_output(["git","show","HEAD:client/src/api/client.ts"],
    cwd=r"C:\Users\50037\Desktop\work", encoding="utf-8")

# The missing methods that were in working copy but not git HEAD
missing = r"""

  listTags: () => apiFetch<any[]>("/tags/"),
  createTag: (data: { name: string; color?: string }) =>
    apiFetch("/tags/", { method: "POST", body: JSON.stringify(data) }),
  deleteTag: (id: number) => apiFetch(`/tags/${id}`, { method: "DELETE" }),

  listPosts: (params: any = {}) => {
    const q = new URLSearchParams();
    if (params.sort) q.set("sort", params.sort);
    if (params.course_id) q.set("course_id", String(params.course_id));
    if (params.tag_id) q.set("tag_id", String(params.tag_id));
    if (params.page) q.set("page", String(params.page));
    if (params.page_size) q.set("page_size", String(params.page_size));
    return apiFetch<any[]>(`/posts/?${q.toString()}`);
  },
  createPost: (data: any) =>
    apiFetch("/posts/", { method: "POST", body: JSON.stringify(data) }),
  getPost: (id: number) => apiFetch<any>(`/posts/${id}`),
  updatePost: (id: number, data: any) =>
    apiFetch(`/posts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePost: (id: number) => apiFetch(`/posts/${id}`, { method: "DELETE" }),
  votePost: (id: number, value: number = 1) =>
    apiFetch(`/posts/${id}/vote?value=${value}`, { method: "POST" }),
  relatedPosts: (id: number) => apiFetch<any[]>(`/posts/${id}/related`),

  listComments: (postId: number, page: number = 1) =>
    apiFetch<any[]>(`/comments/?post_id=${postId}&page=${page}`),
  createComment: (data: any) =>
    apiFetch("/comments/", { method: "POST", body: JSON.stringify(data) }),
  deleteComment: (id: number) => apiFetch(`/comments/${id}`, { method: "DELETE" }),

  listNotebooks: () => apiFetch<any[]>("/notebooks/"),
  createNotebook: (data: any) =>
    apiFetch("/notebooks/", { method: "POST", body: JSON.stringify(data) }),
  getNotebook: (id: number) => apiFetch<any>(`/notebooks/${id}`),
  updateNotebook: (id: number, data: any) =>
    apiFetch(`/notebooks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteNotebook: (id: number) => apiFetch(`/notebooks/${id}`, { method: "DELETE" }),

  listDocs: (notebookId: number) => apiFetch<any[]>(`/notebooks/${notebookId}/docs`),
  createDoc: (notebookId: number, data: any) =>
    apiFetch(`/notebooks/${notebookId}/docs`, { method: "POST", body: JSON.stringify(data) }),
  getDoc: (docId: number) => apiFetch<any>(`/notebooks/docs/${docId}`),
  updateDoc: (docId: number, data: any) =>
    apiFetch(`/notebooks/docs/${docId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDoc: (docId: number) => apiFetch(`/notebooks/docs/${docId}`, { method: "DELETE" }),
  aiSummarize: (docId: number) =>
    apiFetch<any>(`/notebooks/docs/${docId}/ai-summarize`, { method: "POST" }),
  aiSuggest: (docId: number) =>
    apiFetch<any>(`/notebooks/docs/${docId}/ai-suggest`, { method: "POST" }),

  exploreNotebooks: () => apiFetch<any[]>("/notebooks/explore/notebooks"),
  exploreDocs: (tagId?: number) => {
    const q = tagId ? `?tag_id=${tagId}` : "";
    return apiFetch<any[]>(`/notebooks/explore/docs${q}`);
  },
"""

# Insert missing methods before export const api
api_idx = orig.index("export const api = {")
# Insert missing methods INSIDE the api object body
brace_pos = orig.index("{", api_idx)
orig = orig[:brace_pos+1] + "\n" + missing + "\n" + orig[brace_pos+1:]

# Add YUQUE_TOKEN_KEY
orig = orig.replace(
    'const TOKEN_KEY = "ch_token";\n\n',
    'const TOKEN_KEY = "ch_token";\nconst YUQUE_TOKEN_KEY = "yuque_token";\n\n')

# Add getYuqueToken/setYuqueToken
orig = orig.replace(
    '  else localStorage.removeItem(TOKEN_KEY);\n}\n\nexport async function',
    '  else localStorage.removeItem(TOKEN_KEY);\n}\n\n' +
    'export function getYuqueToken(): string | null {\n' +
    '  return localStorage.getItem(YUQUE_TOKEN_KEY);\n' +
    '}\n\n' +
    'export function setYuqueToken(t: string | null) {\n' +
    '  if (t) localStorage.setItem(YUQUE_TOKEN_KEY, t);\n' +
    '  else localStorage.removeItem(YUQUE_TOKEN_KEY);\n' +
    '}\n\nexport async function')

# Build yuqueFetch function
bt = chr(96)  # backtick
dl = chr(36)  # dollar
yuque_fetch_lines = [
    '',
    '/** Fetch with Yuque token header */',
    'async function yuqueFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {',
    '  const yuqueToken = getYuqueToken();',
    '  if (!yuqueToken) throw new Error("未连接语雀");',
    '  const headers = new Headers(init.headers || {});',
    '  headers.set("X-Yuque-Token", yuqueToken);',
    '  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {',
    '    headers.set("Content-Type", "application/json");',
    '  }',
    '  const token = getToken();',
    '  if (token) headers.set("Authorization", ' + bt + 'Bearer ' + dl + '{token}' + bt + ');',
    '  const res = await fetch(' + bt + dl + '{API_BASE}' + dl + '{path}' + bt + ', { ...init, headers });',
    '  if (!res.ok) {',
    '    const text = await res.text().catch(() => "");',
    '    throw new Error(' + bt + dl + '{res.status} ' + dl + '{text}' + bt + ');',
    '  }',
    '  if (res.status === 204) return undefined as any;',
    '  return res.json();',
    '}',
    '',
]
yuque_fetch_lines.append('export const api = {')
yuque_fetch = chr(10).join(yuque_fetch_lines)

# Insert yuqueFetch before export const api
orig = orig.replace(chr(10) + "export const api = {", chr(10) + yuque_fetch)

# Build yuque API methods
yuque_api = []
yuque_api.append('')
yuque_api.append('  // ===== 语雀 =====')
yuque_api.append('  yuque: {')
yuque_api.append('    verify: () => yuqueFetch<any>("/yuque/verify", { method: "POST" }),')
yuque_api.append('')
yuque_api.append('    listRepos: () => yuqueFetch<any[]>("/yuque/repos"),')
yuque_api.append('    getRepo: (id: number) => yuqueFetch<any>(' + bt + '/yuque/repos/' + dl + '{id}' + bt + '),')
yuque_api.append('    createRepo: (data: any) => {')
yuque_api.append('      const params = new URLSearchParams({ name: data.name });')
yuque_api.append('      if (data.description) params.set("description", data.description);')
yuque_api.append('      if (data.slug) params.set("slug", data.slug);')
yuque_api.append('      if (data.public) params.set("public", "true");')
yuque_api.append('      return yuqueFetch<any>(' + bt + '/yuque/repos?' + dl + '{params}' + bt + ', { method: "POST" });')
yuque_api.append('    },')
yuque_api.append('    deleteRepo: (id: number) => yuqueFetch(' + bt + '/yuque/repos/' + dl + '{id}' + bt + ', { method: "DELETE" }),')
yuque_api.append('')
yuque_api.append('    getToc: (repoId: number) => yuqueFetch<any[]>(' + bt + '/yuque/repos/' + dl + '{repoId}/toc' + bt + '),')
yuque_api.append('')
yuque_api.append('    getDoc: (docId: number) => yuqueFetch<any>(' + bt + '/yuque/docs/' + dl + '{docId}' + bt + '),')
yuque_api.append('    createDoc: (repoId: number, data: any) => {')
yuque_api.append('      const params = new URLSearchParams({ title: data.title });')
yuque_api.append('      if (data.body) params.set("body", data.body);')
yuque_api.append('      if (data.format) params.set("format", data.format);')
yuque_api.append('      if (data.slug) params.set("slug", data.slug);')
yuque_api.append('      if (data.public) params.set("public", "true");')
yuque_api.append('      return yuqueFetch<any>(' + bt + '/yuque/repos/' + dl + '{repoId}/docs?' + dl + '{params}' + bt + ', { method: "POST" });')
yuque_api.append('    },')
yuque_api.append('    updateDoc: (docId: number, data: any) => {')
yuque_api.append('      const params = new URLSearchParams();')
yuque_api.append('      if (data.title) params.set("title", data.title);')
yuque_api.append('      if (data.body) params.set("body", data.body);')
yuque_api.append('      if (data.public !== undefined) params.set("public", String(data.public));')
yuque_api.append('      return yuqueFetch<any>(' + bt + '/yuque/docs/' + dl + '{docId}?' + dl + '{params}' + bt + ', { method: "PUT" });')
yuque_api.append('    },')
yuque_api.append('    deleteDoc: (docId: number) => yuqueFetch(' + bt + '/yuque/docs/' + dl + '{docId}' + bt + ', { method: "DELETE" }),')
yuque_api.append('')
yuque_api.append('    search: (q: string, repoId?: number) => {')
yuque_api.append('      const params = new URLSearchParams({ q });')
yuque_api.append('      if (repoId) params.set("repo_id", String(repoId));')
yuque_api.append('      return yuqueFetch<any[]>(' + bt + '/yuque/search?' + dl + '{params}' + bt + ');')
yuque_api.append('    },')
yuque_api.append('  },')
yuque_api_str = chr(10).join(yuque_api)

# Add yuque methods before final };
end_idx = orig.rfind("};")
orig = orig[:end_idx] + yuque_api_str + orig[end_idx:]

# Write
with open(r"C:\Users\50037\Desktop\work\client\src\api\client.ts", "w", encoding="utf-8") as f:
    f.write(orig)
print("Written", len(orig), "bytes")