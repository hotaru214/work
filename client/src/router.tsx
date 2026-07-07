import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/skeleton/Skeletons";

const Login = lazy(() => import("./pages/Login"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Chat = lazy(() => import("./pages/Chat"));
const Plan = lazy(() => import("./pages/Plan"));
const Profile = lazy(() => import("./pages/Profile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const KBList = lazy(() => import("./pages/kb/KBList"));
const KBDetail = lazy(() => import("./pages/kb/KBDetail"));
const ForumList = lazy(() => import("./pages/forum/ForumList"));
const TagManage = lazy(() => import("./pages/TagManage"));
const PostDetail = lazy(() => import("./pages/forum/PostDetail"));
const PostEditor = lazy(() => import("./pages/forum/PostEditor"));

function PageFallback() {
  return <PageSkeleton lines={5} />;
}

function wrap(node: React.ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>{node}</Suspense>
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <Suspense fallback={<PageFallback />}><Login /></Suspense>, errorElement: <RouteErrorBoundary /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/courses" replace /> },
      { path: "courses", element: wrap(<Courses />) },
      { path: "courses/:id", element: wrap(<CourseDetail />) },
      { path: "chat", element: wrap(<Chat />) },
      { path: "chat/:sessionId", element: wrap(<Chat />) },
      { path: "plan", element: wrap(<Plan />) },
      { path: "profile", element: wrap(<Profile />) },
      { path: "tags", element: wrap(<TagManage />) },
      { path: "dashboard", element: wrap(<Dashboard />) },

      // Knowledge Base
      { path: "kb", element: wrap(<KBList />) },
      { path: "kb/:noteId", element: wrap(<KBDetail />) },
      { path: "kb/:noteId/doc/:docId", element: wrap(<KBDetail />) },

      // Forum
      { path: "forum", element: wrap(<ForumList />) },
      { path: "forum/new", element: wrap(<PostEditor />) },
      { path: "forum/:id", element: wrap(<PostDetail />) },
      { path: "forum/:id/edit", element: wrap(<PostEditor />) },
    ],
  },
]);