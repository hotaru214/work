import {
  IconBook2,
  IconChartBar,
  IconDatabase,
  IconLogout,
  IconMessageCircle,
  IconSettings,
  IconTargetArrow,
  IconTags,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  getTriliumToken,
  getTriliumUrl,
  getYuqueToken,
  resolveAssetUrl,
  setToken,
  setTriliumToken,
  setTriliumUrl,
  setYuqueToken,
} from "../api/client";
import { useMe } from "../hooks/api";
import { preloadPage, type PageLoaderKey } from "../pageLoaders";
import GooeyNav from "./GooeyNav";
import { PrimaryButton } from "./PageScaffold";
import { Sidebar, SidebarBody } from "./ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useMutationToast } from "./ui/toast";

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
  const queryClient = useQueryClient();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState<{ username: string; nickname: string; avatar_url?: string | null } | null>(null);
  const [yuqueTokenInput, setYuqueTokenInput] = useState(getYuqueToken() || "");
  const [yuqueUser, setYuqueUser] = useState<any>(null);
  const [yuqueVerifying, setYuqueVerifying] = useState(false);
  const [yuqueError, setYuqueError] = useState("");
  const [triliumUrlInput, setTriliumUrlInput] = useState(getTriliumUrl() || "http://localhost:8080");
  const [triliumTokenInput, setTriliumTokenInput] = useState(getTriliumToken() || "");
  const [triliumConnected, setTriliumConnected] = useState(!!getTriliumUrl() && !!getTriliumToken());
  const [triliumInfo, setTriliumInfo] = useState<any>(null);
  const [triliumConnecting, setTriliumConnecting] = useState(false);
  const [triliumError, setTriliumError] = useState("");
  const toast = useMutationToast();
  const revealClass =
    "sidebar-reveal min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]";

  function logout() {
    setToken(null);
    queryClient.clear();
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

  useEffect(() => {
    if (getYuqueToken()) {
      api.yuque.verify()
        .then((result: any) => setYuqueUser(result.user))
        .catch(() => {
          setYuqueToken(null);
          setYuqueUser(null);
          setYuqueTokenInput("");
        });
    }
    if (getTriliumUrl() && getTriliumToken()) {
      api.trilium.verify()
        .then((result: any) => {
          setTriliumInfo(result);
          setTriliumConnected(true);
        })
        .catch(() => {
          setTriliumUrl(null);
          setTriliumToken(null);
          setTriliumConnected(false);
          setTriliumInfo(null);
        });
    }
  }, []);

  function openSettingsDialog() {
    setYuqueTokenInput(getYuqueToken() || "");
    setTriliumUrlInput(getTriliumUrl() || "http://localhost:8080");
    setTriliumTokenInput(getTriliumToken() || "");
    setYuqueError("");
    setTriliumError("");
    setAccountMenuOpen(false);
    setSettingsOpen(true);
  }

  async function connectYuque() {
    if (!yuqueTokenInput.trim()) return;
    setYuqueVerifying(true);
    setYuqueError("");
    setYuqueToken(yuqueTokenInput.trim());
    try {
      const result: any = await api.yuque.verify();
      setYuqueUser(result.user);
      toast.success("语雀连接已保存");
    } catch {
      setYuqueToken(null);
      setYuqueUser(null);
      setYuqueError("连接失败，请检查 Token 是否正确");
      toast.error("语雀连接失败");
    } finally {
      setYuqueVerifying(false);
    }
  }

  function disconnectYuque() {
    setYuqueToken(null);
    setYuqueTokenInput("");
    setYuqueUser(null);
    setYuqueError("");
    toast.success("已断开语雀连接");
  }

  async function connectTrilium() {
    if (!triliumUrlInput.trim() || !triliumTokenInput.trim()) return;
    setTriliumConnecting(true);
    setTriliumError("");
    setTriliumUrl(triliumUrlInput.trim());
    setTriliumToken(triliumTokenInput.trim());
    try {
      const result: any = await api.trilium.verify();
      setTriliumInfo(result);
      setTriliumConnected(true);
      toast.success("Trilium 连接已保存");
    } catch {
      setTriliumUrl(null);
      setTriliumToken(null);
      setTriliumConnected(false);
      setTriliumError("连接失败，请检查地址和 Token 是否正确");
      toast.error("Trilium 连接失败");
    } finally {
      setTriliumConnecting(false);
    }
  }

  function disconnectTrilium() {
    setTriliumUrl(null);
    setTriliumToken(null);
    setTriliumUrlInput("http://localhost:8080");
    setTriliumTokenInput("");
    setTriliumConnected(false);
    setTriliumInfo(null);
    setTriliumError("");
    toast.success("已断开 Trilium 连接");
  }

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
                    onClick={openSettingsDialog}
                  >
                    <span className="flex items-center gap-3">
                      <IconSettings size={20} stroke={1.9} />
                      设置
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

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto rounded-3xl border-neutral-200 bg-white p-0 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl">设置</DialogTitle>
              <DialogDescription>管理当前账号的外部知识库连接，配置会保存在本地浏览器。</DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-5 px-6 py-5">
            <SettingsConnectionCard
              title="语雀"
              description="用于读取和管理语雀知识库。"
              connected={!!yuqueUser}
              connectedTitle={yuqueUser?.name}
              connectedSubtitle={yuqueUser?.login}
              onDisconnect={disconnectYuque}
            >
              <p className="text-sm leading-6 text-slate-500">
                前往
                <a href="https://www.yuque.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="mx-1 font-medium text-blue-600 hover:underline">
                  语雀 Token 设置页面
                </a>
                创建个人访问令牌。
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  value={yuqueTokenInput}
                  onChange={(event) => setYuqueTokenInput(event.target.value)}
                  placeholder="输入语雀个人访问令牌"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
                <PrimaryButton
                  type="button"
                  disabled={yuqueVerifying || !yuqueTokenInput.trim()}
                  onClick={connectYuque}
                  className="h-11 rounded-xl px-5"
                >
                  {yuqueVerifying ? "验证中..." : "连接"}
                </PrimaryButton>
              </div>
              {yuqueError && <div className="mt-2 text-sm text-rose-600">{yuqueError}</div>}
            </SettingsConnectionCard>

            <SettingsConnectionCard
              title="Trilium Notes"
              description="用于同步和管理本地 Trilium 笔记。"
              connected={triliumConnected}
              connectedTitle={triliumInfo?.app_name || "Trilium"}
              connectedSubtitle={triliumInfo ? `v${triliumInfo.version || ""} (build ${triliumInfo.build || ""})` : triliumUrlInput}
              onDisconnect={disconnectTrilium}
            >
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={triliumUrlInput}
                  onChange={(event) => setTriliumUrlInput(event.target.value)}
                  placeholder="http://localhost:8080"
                  className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
                <input
                  type="password"
                  value={triliumTokenInput}
                  onChange={(event) => setTriliumTokenInput(event.target.value)}
                  placeholder="输入 Trilium API Token"
                  className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
                <PrimaryButton
                  type="button"
                  disabled={triliumConnecting || !triliumUrlInput.trim() || !triliumTokenInput.trim()}
                  onClick={connectTrilium}
                  className="h-11 rounded-xl px-5"
                >
                  {triliumConnecting ? "连接中..." : "连接"}
                </PrimaryButton>
              </div>
              {triliumError && <div className="mt-2 text-sm text-rose-600">{triliumError}</div>}
            </SettingsConnectionCard>
          </div>
        </DialogContent>
      </Dialog>

      <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-auto border border-neutral-200 bg-white md:rounded-l-[22px]">
        <Outlet />
      </main>
    </div>
  );
}

function SettingsConnectionCard({
  title,
  description,
  connected,
  connectedTitle,
  connectedSubtitle,
  onDisconnect,
  children,
}: {
  title: string;
  description: string;
  connected: boolean;
  connectedTitle?: string;
  connectedSubtitle?: string;
  onDisconnect: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {connected ? "已连接" : "未连接"}
        </span>
      </div>
      {connected ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-950">{connectedTitle || "已连接"}</div>
            {connectedSubtitle && <div className="mt-1 truncate text-xs text-slate-500">{connectedSubtitle}</div>}
          </div>
          <button type="button" onClick={onDisconnect} className="mt-3 text-sm font-medium text-rose-600 transition hover:text-rose-700">
            断开连接
          </button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
