import {
  IconBook2,
  IconChartBar,
  IconDatabase,
  IconLogout,
  IconMessageCircle,
  IconTargetArrow,
  IconTags,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { resolveAssetUrl, setToken } from "../api/client";
import { useMe } from "../hooks/api";
import { preloadPage, type PageLoaderKey } from "../pageLoaders";
import GooeyNav from "./GooeyNav";
import { Sidebar, SidebarBody } from "./ui/sidebar";

const navs = [
  { to: "/dashboard", label: "仪表盘", icon: IconChartBar, loader: "dashboard" },
  { to: "/courses", label: "课程", icon: IconBook2, loader: "courses" },
  { to: "/chat", label: "对话", icon: IconMessageCircle, loader: "chat" },
  { to: "/kb", label: "知识库", icon: IconDatabase, loader: "kbList" },
  { to: "/plan", label: "学习计划", icon: IconTargetArrow, loader: "plan" },
  { to: "/forum", label: "讨论区", icon: IconUsers, loader: "forumList" },
  { to: "/tags", label: "标签管理", icon: IconTags, loader: "tagManage" },
  { to: "/profile", label: "个人中心", icon: IconUserCircle, loader: "profile" },
] satisfies Array<{ to: string; label: string; icon: typeof IconChartBar; loader: PageLoaderKey }>;


export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ username: string; nickname: string; avatar_url?: string | null } | null>(null);
  const revealClass =
    "sidebar-reveal min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]";

  function logout() {
    setToken(null);
    navigate("/login", { replace: true });
  }

  const activeNavIndex = Math.max(
    0,
    navs.findIndex((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
  );
  const gooeyItems = navs.map((item) => {
    const Icon = item.icon;
    return {
      label: item.label,
      href: item.to,
      icon: <Icon size={24} stroke={2} className="transition-colors" />,
    };
  });

  const { data: profileData } = useMe();
  useEffect(() => {
    if (profileData) setProfile(profileData);
  }, [profileData]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.search]);

  // 仍保留：其他页面 dispatch 后立即同步（避免缓存失效延迟）
  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      setProfile((event as CustomEvent).detail);
    };
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-updated", onProfileUpdated);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-neutral-900 md:flex-row">
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
          className="border-r border-neutral-200 bg-neutral-50 px-5 py-8 text-neutral-700"
          style={{ "--sidebar-open": open ? 1 : 0 } as CSSProperties}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-[58px] flex h-8 items-center gap-4">
              <div className="flex w-[30px] shrink-0 justify-start">
                <div className="h-[22px] w-[30px] rounded-[9px] bg-black" />
              </div>
              <div
                className={[
                  revealClass,
                  "text-[17px] font-semibold tracking-tight text-black",
                ].join(" ")}
              >
                学习实验室
              </div>
            </div>

            <nav className="flex flex-1 flex-col">
              <GooeyNav
                items={gooeyItems}
                activeIndex={activeNavIndex}
                orientation="vertical"
                particleCount={18}
                particleDistances={[34, 6]}
                particleR={68}
                animationTime={460}
                timeVariance={120}
                colors={[1, 1, 1, 2, 2, 3]}
                labelClassName={revealClass}
                onItemPrefetch={(_, index) => preloadPage(navs[index].loader)}
                onItemClick={(item) => navigate(item.href)}
              />
            </nav>

            <div className="relative mt-auto pb-1">
              {accountMenuOpen && open && (
                <div className="absolute bottom-[58px] left-[-2px] w-[220px] animate-[account-menu-in_180ms_cubic-bezier(0.16,1,0.3,1)] rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur">
                  <div className="flex h-9 items-center gap-3 border-b border-neutral-200 px-2 pb-3 text-sm text-neutral-400">
                    <IconUserCircle size={18} stroke={1.8} />
                    <span>已通过用户名登录</span>
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
                    {profile?.avatar_url ? (
                      <img src={resolveAssetUrl(profile.avatar_url) ?? ""} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      "学"
                    )}
                  </span>
                </span>
                <span
                  className={[
                    revealClass,
                  ].join(" ")}
                >
                  <span className="block truncate text-[16px] text-neutral-800">{profile?.nickname || "学习者"}</span>
                  <span className="block truncate text-sm text-neutral-400">{profile?.username || "用户名"}</span>
                </span>
              </button>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-auto border border-neutral-200 bg-white md:rounded-l-[22px]">
        <Outlet />
      </main>
    </div>
  );
}
