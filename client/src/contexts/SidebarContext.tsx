import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  subSidebarOpen: boolean;
  toggleSubSidebar: () => void;
  setSubSidebarOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [subSidebarOpen, setSubSidebarOpen] = useState(true);

  return (
    <SidebarContext.Provider
      value={{
        subSidebarOpen,
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
