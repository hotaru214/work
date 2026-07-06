import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { setToken } from "../api/client";
import { useSidebar } from "../contexts/SidebarContext";

const navs = [
  { to: "/courses", label: "课程" },
  { to: "/chat", label: "对话" },
  { to: "/kb", label: "知识库" },
  { to: "/plan", label: "学习计划" },
  { to: "/profile", label: "个人中心" },
];

export default function Layout() {
  const navigate = useNavigate();
  const { mainSidebarOpen, toggleMainSidebar } = useSidebar();

  return (
    <div className="flex h-full">
      {/* Toggle button for main sidebar */}
      <button
        onClick={toggleMainSidebar}
        className="fixed top-3 z-50 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 bg-white/80 shadow-sm text-slate-600"
        title={mainSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
        style={{ left: mainSidebarOpen ? "13rem" : "0.75rem", transition: "left 0.2s" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Main sidebar */}
      <aside
        className="bg-slate-900 text-slate-100 flex flex-col overflow-hidden transition-all duration-200"
        style={{ width: mainSidebarOpen ? "14rem" : "0rem", minWidth: mainSidebarOpen ? "14rem" : "0rem" }}
      >
        <div className="px-4 py-5 text-lg font-semibold border-b border-slate-700 whitespace-nowrap">
          课程学习助手
        </div>
        <nav className="flex-1 py-2">
          {navs.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm hover:bg-slate-800 whitespace-nowrap ${isActive ? "bg-slate-800" : ""}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="px-4 py-3 text-sm text-left text-slate-300 hover:bg-slate-800 border-t border-slate-700 whitespace-nowrap"
          onClick={() => {
            setToken(null);
            navigate("/login", { replace: true });
          }}
        >
          退出登录
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
