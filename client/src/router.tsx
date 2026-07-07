import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Chat from "./pages/Chat";
import Plan from "./pages/Plan";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import KBList from "./pages/kb/KBList";
import KBDetail from "./pages/kb/KBDetail";
import ForumList from "./pages/forum/ForumList";
import TagManage from "./pages/TagManage";
import PostDetail from "./pages/forum/PostDetail";
import PostEditor from "./pages/forum/PostEditor";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/courses" replace /> },
      { path: "courses", element: <Courses /> },
      { path: "courses/:id", element: <CourseDetail /> },
      { path: "chat", element: <Chat /> },
      { path: "chat/:sessionId", element: <Chat /> },
      { path: "plan", element: <Plan /> },
      { path: "profile", element: <Profile /> },
      { path: "tags", element: <TagManage /> },
      { path: "dashboard", element: <Dashboard /> },

      // Knowledge Base
      { path: "kb", element: <KBList /> },
      { path: "kb/:noteId", element: <KBDetail /> },
      { path: "kb/:noteId/doc/:docId", element: <KBDetail /> },

      // Forum
      { path: "forum", element: <ForumList /> },
      { path: "forum/new", element: <PostEditor /> },
      { path: "forum/:id", element: <PostDetail /> },
      { path: "forum/:id/edit", element: <PostEditor /> },
    ],
  },
]);