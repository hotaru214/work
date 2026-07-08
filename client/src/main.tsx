import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { SidebarProvider } from "./contexts/SidebarContext";
import QueryProvider from "./components/QueryProvider";
import { ToastProvider } from "./components/ui/toast";
import { installGlobalErrorReporting } from "./utils/error-reporting";
// @ts-ignore: side-effect import for CSS (no type declarations)
import "./index.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

installGlobalErrorReporting();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryProvider>
      <ToastProvider>
        <SidebarProvider>
          <RouterProvider router={router} />
        </SidebarProvider>
      </ToastProvider>
    </QueryProvider>
  </React.StrictMode>
);
