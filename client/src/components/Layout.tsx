import {
  IconBook2,
  IconChartBar,
  IconDatabase,
  IconLogout,
  IconMessageCircle,
  IconTargetArrow,
  IconUserCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { setToken } from "../api/client";
import { Sidebar, SidebarBody } from "./ui/sidebar";

const navs = [
  { to: "/dashboard", label: "仪表盘", icon: IconChartBar },
  { to: "/courses", label: "课程", icon: IconBook2 },
  { to: "/chat", label: "对话", icon: IconMessageCircle },
  { to: "/kb", label: "知识库", icon: IconDatabase },
  { to: "/plan", label: "学习计划", icon: IconTargetArrow },
];

export default function Layout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  function logout() {
    setToken(null);
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-full overflow-hidden bg-white text-neutral-900">
      <Sidebar
        open={open}
        setOpen={(next) => {
          const nextOpen = typeof next === "function" ? next(open) : next;
          setOpen(nextOpen);
          if (!nextOpen) {
            setAccountMenuOpen(false);
          }
        }}
        animate
      >
        <SidebarBody
          onMouseLeave={() => setAccountMenuOpen(false)}
          className="border-r border-neutral-200 bg-neutral-50 px-6 py-8 text-neutral-700"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-[58px] flex h-8 items-center gap-4">
              <div className="flex w-[30px] shrink-0 justify-start">
                <div className="h-[22px] w-[30px] rounded-[9px] bg-black" />
              </div>
              <div
                className={[
                  "min-w-0 truncate text-[17px] font-semibold tracking-tight text-black transition-opacity duration-150",
                  open ? "w-auto opacity-100" : "pointer-events-none w-0 opacity-0",
                ].join(" ")}
              >
                  学习实验室
              </div>
            </div>

            <nav className="flex flex-1 flex-col gap-[29px]">
              {navs.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={!open ? item.label : undefined}
                    className={({ isActive }) =>
                      [
                        "group flex h-7 items-center gap-4 rounded-lg text-[17px] font-normal transition-colors",
                        isActive
                          ? "text-neutral-900"
                          : "text-neutral-600 hover:text-neutral-900",
                      ].join(" ")
                    }
                  >
                    <span className="flex w-[30px] shrink-0 justify-center">
                      <Icon size={24} stroke={2} className="text-neutral-600 transition-colors group-hover:text-neutral-900" />
                    </span>
                    <span
                      className={[
                        "min-w-0 truncate transition-opacity duration-150",
                        open ? "w-auto opacity-100" : "pointer-events-none w-0 opacity-0",
                      ].join(" ")}
                    >
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="relative mt-auto pb-1">
              {accountMenuOpen && open && (
                <div className="absolute bottom-[58px] left-[-2px] w-[365px] animate-[account-menu-in_180ms_cubic-bezier(0.16,1,0.3,1)] rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur">
                  <div className="flex h-9 items-center gap-3 border-b border-neutral-200 px-2 pb-3 text-sm text-neutral-400">
                    <IconUserCircle size={18} stroke={1.8} />
                    <span>已通过本地账号登录</span>
                  </div>
                  <button
                    type="button"
                    className="mt-2 flex h-10 w-full items-center justify-between rounded-xl px-2 text-left text-[15px] text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      navigate("/profile");
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <IconUserCircle size={20} stroke={1.9} />
                      个人信息
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center gap-3 rounded-xl px-2 text-left text-[15px] text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                    onClick={logout}
                  >
                    <IconLogout size={20} stroke={1.9} />
                    退出登录
                  </button>
                </div>
              )}

              <button
                type="button"
                title={!open ? "学习者" : undefined}
                className="flex h-10 w-full items-center gap-3 rounded-xl text-left transition-colors hover:bg-neutral-100"
                onClick={() => {
                  if (!open) {
                    setOpen(true);
                    setAccountMenuOpen(false);
                    return;
                  }
                  setAccountMenuOpen((v) => !v);
                }}
              >
                <span className="flex w-[30px] shrink-0 justify-center">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600">
                    学
                  </span>
                </span>
                <span
                  className={[
                    "min-w-0 transition-opacity duration-150",
                    open ? "w-auto opacity-100" : "pointer-events-none w-0 opacity-0",
                  ].join(" ")}
                >
                    <span className="block truncate text-[16px] text-neutral-800">学习者</span>
                    <span className="block truncate text-sm text-neutral-400">账户</span>
                </span>
              </button>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <main className="min-w-0 flex-1 overflow-auto rounded-l-[22px] border border-neutral-200 bg-white">
        <Outlet />
      </main>
    </div>
  );
}
