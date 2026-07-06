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
import KBList from "./pages/kb/KBList";
import KBDetail from "./pages/kb/KBDetail";
import DocEditor from "./pages/kb/DocEditor";

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

      // Knowledge Base
      { path: "kb", element: <KBList /> },
      {
        path: "kb/:notebookId",
        element: <KBDetail />,
        children: [
          { path: "doc/:docId", element: <DocEditor /> },
        ],
      },
    ],
  },
]);
