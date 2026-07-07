import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

/** 用户身份 — 高频被读，长缓存 */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
    staleTime: 5 * 60 * 1000,
  });
}

/** 课程列表 */
export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: () => api.listCourses(),
    staleTime: 60 * 1000,
  });
}

/** 课程详情 */
export function useCourse(id: number | null | undefined) {
  return useQuery({
    queryKey: ["course", id],
    queryFn: () => api.getCourse(id!),
    enabled: id != null,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePrefetchCourse() {
  const qc = useQueryClient();
  return (id: number) => {
    qc.prefetchQuery({
      queryKey: ["course", id],
      queryFn: () => api.getCourse(id),
      staleTime: 2 * 60 * 1000,
    });
  };
}

/** 课程资料 */
export function useMaterials(courseId: number | null | undefined) {
  return useQuery({
    queryKey: ["materials", courseId],
    queryFn: () => api.listMaterials(courseId!),
    enabled: courseId != null,
    staleTime: 60 * 1000,
  });
}

/** 任务列表（个人中心 / 仪表盘） */
export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.listTasks(),
    staleTime: 30 * 1000,
  });
}

/** 标签 */
export function useTags(search?: string) {
  return useQuery({
    queryKey: ["tags", search ?? ""],
    queryFn: () => api.listTags(search),
    staleTime: 2 * 60 * 1000,
  });
}

/** 仪表盘 */
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    staleTime: 30 * 1000,
  });
}

/** 会话列表 */
export function useSessions() {
  return useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => api.listSessions(),
    staleTime: 30 * 1000,
  });
}

/** 论坛列表（带动态 query key） */
export function usePosts(params: {
  sort?: string;
  search?: string;
  course_id?: number;
  tag_id?: number;
  page?: number;
  page_size?: number;
}) {
  const q = new URLSearchParams();
  if (params.sort) q.set("sort", params.sort);
  if (params.search) q.set("search", params.search);
  if (params.course_id) q.set("course_id", String(params.course_id));
  if (params.tag_id) q.set("tag_id", String(params.tag_id));
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));
  const key = q.toString();
  return useQuery({
    queryKey: ["posts", key],
    queryFn: () => api.listPosts(params),
    staleTime: 30 * 1000,
  });
}

export function usePrefetchPost() {
  const qc = useQueryClient();
  return (id: number) => {
    qc.prefetchQuery({
      queryKey: ["post", id],
      queryFn: () => api.getPost(id),
      staleTime: 60 * 1000,
    });
  };
}

/** 帖子详情 */
export function usePost(id: number | null | undefined) {
  return useQuery({
    queryKey: ["post", id],
    queryFn: () => api.getPost(id!),
    enabled: id != null,
    staleTime: 60 * 1000,
  });
}

export function useRelatedPosts(id: number | null | undefined) {
  return useQuery({
    queryKey: ["related-posts", id],
    queryFn: () => api.relatedPosts(id!),
    enabled: id != null,
    staleTime: 60 * 1000,
  });
}

/** 帖子评论 */
export function useComments(postId: number | null | undefined) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => api.listComments(postId!),
    enabled: postId != null,
    staleTime: 30 * 1000,
  });
}

export function useKbRoots() {
  return useQuery({
    queryKey: ["kb-roots"],
    queryFn: () => api.kb.roots(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useKbTrash(enabled = false) {
  return useQuery({
    queryKey: ["kb-trash"],
    queryFn: () => api.kb.trash(),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useKbNote(noteId: string | null | undefined) {
  return useQuery({
    queryKey: ["kb-note", noteId],
    queryFn: () => api.kb.getNote(noteId!),
    enabled: !!noteId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useKbTree(noteId: string | null | undefined) {
  return useQuery({
    queryKey: ["kb-tree", noteId],
    queryFn: () => api.kb.getNoteTree(noteId!),
    enabled: !!noteId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePrefetchKbNote() {
  const qc = useQueryClient();
  return (noteId: string) => {
    qc.prefetchQuery({
      queryKey: ["kb-note", noteId],
      queryFn: () => api.kb.getNote(noteId),
      staleTime: 2 * 60 * 1000,
    });
  };
}

// ===== Mutations =====

export function useMutateInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return {
    succeed: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  };
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      api.toggleTask(id, done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteMaterial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createCourse(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => api.createTag(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateTag(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}
