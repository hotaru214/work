import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { setToken } from "../api/client";

const navs = [
  { to: "/dashboard", label: "仪表盘" },
  { to: "/courses", label: "课程" },
  { to: "/chat", label: "对话" },
  { to: "/plan", label: "学习计划" },
  { to: "/profile", label: "个人中心" },
];

export default function Layout() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full">
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-4 py-5 text-lg font-semibold border-b border-slate-700">
          课程学习助手
        </div>
        <nav className="flex-1 py-2">
          {navs.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm hover:bg-slate-800 ${isActive ? "bg-slate-800" : ""}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="px-4 py-3 text-sm text-left text-slate-300 hover:bg-slate-800 border-t border-slate-700"
          onClick={() => {
            setToken(null);
            navigate("/login", { replace: true });
          }}
        >
          退出登录
        </button>
      </aside>
      <main className="flex-1 bg-slate-50 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}