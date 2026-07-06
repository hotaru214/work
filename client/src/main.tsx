import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { SidebarProvider } from "./contexts/SidebarContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SidebarProvider>
      <RouterProvider router={router} />
    </SidebarProvider>
  </React.StrictMode>
);
