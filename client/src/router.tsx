import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/skeleton/Skeletons";
import { pageLoaders } from "./pageLoaders";

const Login = lazy(pageLoaders.login);
const Courses = lazy(pageLoaders.courses);
const CourseDetail = lazy(pageLoaders.courseDetail);
const Chat = lazy(pageLoaders.chat);
const Plan = lazy(pageLoaders.plan);
const Profile = lazy(pageLoaders.profile);
const Dashboard = lazy(pageLoaders.dashboard);
const KBList = lazy(pageLoaders.kbList);
const KBDetail = lazy(pageLoaders.kbDetail);
const ForumList = lazy(pageLoaders.forumList);
const TagManage = lazy(pageLoaders.tagManage);
const PostDetail = lazy(pageLoaders.postDetail);
const PostEditor = lazy(pageLoaders.postEditor);

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
