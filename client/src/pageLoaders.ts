export const pageLoaders = {
  login: () => import("./pages/Login"),
  courses: () => import("./pages/Courses"),
  courseDetail: () => import("./pages/CourseDetail"),
  chat: () => import("./pages/Chat"),
  plan: () => import("./pages/Plan"),
  profile: () => import("./pages/Profile"),
  dashboard: () => import("./pages/Dashboard"),
  kbList: () => import("./pages/kb/KBList"),
  kbDetail: () => import("./pages/kb/KBDetail"),
  forumList: () => import("./pages/forum/ForumList"),
  tagManage: () => import("./pages/TagManage"),
  postDetail: () => import("./pages/forum/PostDetail"),
  postEditor: () => import("./pages/forum/PostEditor"),
};

export type PageLoaderKey = keyof typeof pageLoaders;

const preloadedPages = new Set<PageLoaderKey>();

export function preloadPage(loader: PageLoaderKey) {
  if (preloadedPages.has(loader)) return;
  preloadedPages.add(loader);
  void pageLoaders[loader]().catch(() => {
    preloadedPages.delete(loader);
  });
}
