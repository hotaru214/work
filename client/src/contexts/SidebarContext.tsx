import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  mainSidebarOpen: boolean;
  subSidebarOpen: boolean;
  toggleMainSidebar: () => void;
  toggleSubSidebar: () => void;
  setSubSidebarOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mainSidebarOpen, setMainSidebarOpen] = useState(true);
  const [subSidebarOpen, setSubSidebarOpen] = useState(true);

  return (
    <SidebarContext.Provider
      value={{
        mainSidebarOpen,
        subSidebarOpen,
        toggleMainSidebar: () => setMainSidebarOpen((p) => !p),
        toggleSubSidebar: () => setSubSidebarOpen((p) => !p),
        setSubSidebarOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
