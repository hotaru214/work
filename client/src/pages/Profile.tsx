import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  CheckCircle2,
  Cloud,
  Database,
  Link2,
  Settings2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  api,
  getTriliumToken,
  getTriliumUrl,
  getYuqueToken,
  resolveAssetUrl,
  setTriliumToken,
  setTriliumUrl,
  setYuqueToken,
} from "../api/client";
import { useCourses, useDeleteTask, useMe, useTasks, useToggleTask } from "../hooks/api";
import { useMutationToast } from "../components/ui/toast";
import { InteractiveHoverButton } from "../components/ui/interactive-hover-button";
import {
  EmptyState,
  ErrorState,
  IconBadge,
  MetricCard,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  Surface,
  TextField,
} from "../components/PageScaffold";

export default function Profile() {
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState("学习者");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const { data: me } = useMe();
  const { data: courses } = useCourses();
  const { data: tasks } = useTasks();
  const toggleTaskMut = useToggleTask();
  const deleteTaskMut = useDeleteTask();
  const toast = useMutationToast();
  const [yuqueToken, setLocalYuqueToken] = useState(getYuqueToken() || "");
  const [yuqueUser, setYuqueUser] = useState<any>(null);
  const [yuqueVerifying, setYuqueVerifying] = useState(false);
  const [yuqueError, setYuqueError] = useState("");
  const [triliumUrl, setLocalTriliumUrl] = useState(getTriliumUrl() || "http://localhost:8080");
  const [triliumToken, setLocalTriliumToken] = useState(getTriliumToken() || "");
  const [triliumConnected, setTriliumConnected] = useState(!!getTriliumUrl() && !!getTriliumToken());
  const [triliumInfo, setTriliumInfo] = useState<any>(null);
  const [triliumConnecting, setTriliumConnecting] = useState(false);
  const [triliumError, setTriliumError] = useState("");
  const [deletingTask, setDeletingTask] = useState<any | null>(null);
  const hasProfileChanges = !!avatarFile || nickname !== (me?.nickname || "学习者");
  const courseCount = courses?.length ?? 0;
  const taskItems = tasks ?? [];
  const completedTasks = taskItems.filter((item: any) => item.done).length;

  useEffect(() => {
    if (me) setNickname(me.nickname || "学习者");
  }, [me]);

  useEffect(() => {
    if (getTriliumUrl() && getTriliumToken()) {
      api.trilium.verify()
        .then((result: any) => {
          setTriliumInfo(result);
          setTriliumConnected(true);
        })
        .catch(() => {
          setTriliumConnected(false);
          setTriliumToken("");
          setTriliumUrl("");
        });
    }
  }, []);

  useEffect(() => {
    if (getYuqueToken()) {
      api.yuque.verify()
        .then((result: any) => setYuqueUser(result.user))
        .catch(() => {
          setYuqueToken("");
          setYuqueUser(null);
        });
    }
  }, []);

  async function toggle(id: number, done: boolean) {
    try {
      await toggleTaskMut.mutateAsync({ id, done });
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    }
  }

  async function confirmDeleteTask() {
    if (!deletingTask) return;
    try {
      await deleteTaskMut.mutateAsync(deletingTask.id);
      toast.success("已删除任务");
      setDeletingTask(null);
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    }
  }

  async function handleConnect() {
    if (!yuqueToken.trim()) return;
    setYuqueVerifying(true);
    setYuqueError("");
    setYuqueToken(yuqueToken.trim());
    try {
      const result: any = await api.yuque.verify();
      setYuqueUser(result.user);
    } catch {
      setYuqueError("连接失败，请检查 Token 是否正确");
      setYuqueUser(null);
      setYuqueToken("");
    } finally {
      setYuqueVerifying(false);
    }
  }

  async function handleTriliumConnect() {
    if (!triliumUrl.trim() || !triliumToken.trim()) return;
    setTriliumConnecting(true);
    setTriliumError("");
    setTriliumUrl(triliumUrl.trim());
    setTriliumToken(triliumToken.trim());
    try {
      const result: any = await api.trilium.verify();
      setTriliumInfo(result);
      setTriliumConnected(true);
    } catch {
      setTriliumError("连接失败，请检查地址和 Token 是否正确");
      setTriliumConnected(false);
    } finally {
      setTriliumConnecting(false);
    }
  }

  function handleTriliumDisconnect() {
    setTriliumUrl("");
    setLocalTriliumUrl("http://localhost:8080");
    setTriliumToken("");
    setLocalTriliumToken("");
    setTriliumConnected(false);
    setTriliumInfo(null);
  }

  function handleDisconnect() {
    setYuqueToken("");
    setLocalYuqueToken("");
    setYuqueUser(null);
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMessage("");
    try {
      let avatarUrl = me?.avatar_url ?? null;
      if (avatarFile) {
        const upload = await api.uploadAvatar(avatarFile);
        avatarUrl = upload.avatar_url;
      }
      const updated = await api.updateMe({ nickname, avatar_url: avatarUrl });
      queryClient.setQueryData(["me"], updated);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: updated }));
      setNickname(updated.nickname || "学习者");
      setEditingNickname(false);
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      setProfileMessage("个人信息已更新");
    } catch (e: any) {
      setProfileMessage(e.message || "保存失败");
    } finally {
      setProfileSaving(false);
    }
  }

  function cancelProfileChanges() {
    setNickname(me?.nickname || "学习者");
    setEditingNickname(false);
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    setProfileMessage("");
  }

  return (
    <PageShell title="个人中心" description="管理头像、昵称、外部知识库连接和待办任务。">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="课程数" value={courseCount} hint="当前学习课程" icon={Cloud} tone="blue" />
        <MetricCard label="任务数" value={taskItems.length} hint={`${completedTasks} 个已完成`} icon={CheckCircle2} tone="emerald" progress={taskItems.length ? Math.round((completedTasks / taskItems.length) * 100) : 0} />
        <MetricCard label="外部连接" value={(yuqueUser ? 1 : 0) + (triliumConnected ? 1 : 0)} hint="语雀 / Trilium" icon={Link2} tone="violet" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Surface className="p-5">
            <div className="mb-5 flex items-center gap-3">
              <IconBadge icon={UserRound} tone="slate" />
              <div>
                <h2 className="text-sm font-semibold text-slate-950">账户信息</h2>
                <p className="mt-0.5 text-xs text-slate-500">头像可点击上传，昵称双击后编辑。</p>
              </div>
            </div>
            <div className="flex items-start gap-5">
              <motion.label
                className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-violet-100 text-3xl font-semibold text-violet-600 ring-1 ring-slate-200 transition hover:ring-violet-300"
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {avatarPreview || me?.avatar_url ? (
                  <img src={avatarPreview || resolveAssetUrl(me?.avatar_url) || ""} alt="头像" className="h-full w-full object-cover" />
                ) : (
                  "学"
                )}
                <span className="absolute inset-0 flex items-end justify-center bg-black/0 pb-3 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                  更换头像
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setAvatarFile(file);
                    setProfileMessage("");
                    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                    setAvatarPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </motion.label>
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <div className="text-xs font-medium text-slate-400">用户名</div>
                  <div className="mt-1 truncate text-lg font-semibold text-slate-950">{me?.username ?? "-"}</div>
                  <div className="mt-1 text-xs text-slate-400">用户名不可重复，暂不支持修改。</div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-400">昵称</div>
                  {editingNickname ? (
                    <TextField
                      autoFocus
                      value={nickname}
                      onChange={(event) => {
                        setNickname(event.target.value);
                        setProfileMessage("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setNickname(me?.nickname || "学习者");
                          setEditingNickname(false);
                        }
                      }}
                      placeholder="昵称可重复"
                    />
                  ) : (
                    <button
                      type="button"
                      onDoubleClick={() => setEditingNickname(true)}
                      className="block w-full rounded-lg px-0 py-1 text-left text-lg font-semibold text-slate-950 outline-none transition hover:text-violet-600"
                      title="双击修改昵称"
                    >
                      {nickname || "学习者"}
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {(hasProfileChanges || profileSaving) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22 }}
                      className="flex items-center gap-3"
                    >
                      <InteractiveHoverButton
                        type="button"
                        onClick={saveProfile}
                        disabled={profileSaving}
                        hoverIcon={<Check size={18} strokeWidth={2.4} />}
                        hoverDotClassName="bg-emerald-500"
                        className="rounded-lg border-slate-900 bg-white px-5 py-2 text-sm font-medium text-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {profileSaving ? "保存中..." : "保存"}
                      </InteractiveHoverButton>
                      <InteractiveHoverButton
                        type="button"
                        onClick={cancelProfileChanges}
                        disabled={profileSaving}
                        hoverIcon={<X size={18} strokeWidth={2.4} />}
                        hoverDotClassName="bg-red-500"
                        className="rounded-lg border-red-500 bg-white px-5 py-2 text-sm font-medium text-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        取消
                      </InteractiveHoverButton>
                    </motion.div>
                  )}
                </AnimatePresence>
                {profileMessage && <div className="text-sm text-slate-500">{profileMessage}</div>}
              </div>
            </div>
          </Surface>

          <IntegrationCard
            title="连接语雀"
            description="连接后可浏览和管理你的语雀知识库。"
            icon={Cloud}
            connected={!!yuqueUser}
            connectedTitle={yuqueUser?.name}
            connectedSubtitle={yuqueUser?.login}
            onDisconnect={handleDisconnect}
          >
            <div className="space-y-3">
              <p className="text-sm leading-6 text-slate-500">
                前往
                <a href="https://www.yuque.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="mx-1 font-medium text-blue-600 hover:underline">语雀 Token 设置页面</a>
                创建个人访问令牌。
              </p>
              <div className="flex gap-2">
                <TextField placeholder="输入语雀个人访问令牌" value={yuqueToken} onChange={(event) => setLocalYuqueToken(event.target.value)} />
                <PrimaryButton onClick={handleConnect} disabled={yuqueVerifying || !yuqueToken.trim()} className="shrink-0">
                  {yuqueVerifying ? "验证中..." : "连接"}
                </PrimaryButton>
              </div>
              {yuqueError && <ErrorState message={yuqueError} />}
            </div>
          </IntegrationCard>
        </div>

        <div className="space-y-6">
          <IntegrationCard
            title="连接 Trilium Notes"
            description="连接后可同步管理本地 Trilium 笔记。"
            icon={Database}
            connected={triliumConnected}
            connectedTitle={triliumInfo?.app_name || "Trilium"}
            connectedSubtitle={triliumInfo ? `v${triliumInfo.version || ""} (build ${triliumInfo.build || ""})` : triliumUrl}
            onDisconnect={handleTriliumDisconnect}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField placeholder="http://localhost:8080" value={triliumUrl} onChange={(event) => setLocalTriliumUrl(event.target.value)} />
              <TextField placeholder="输入 Trilium API Token" value={triliumToken} onChange={(event) => setLocalTriliumToken(event.target.value)} />
              <div className="md:col-span-2">
                <PrimaryButton onClick={handleTriliumConnect} disabled={triliumConnecting || !triliumUrl.trim() || !triliumToken.trim()}>
                  {triliumConnecting ? "连接中..." : "连接"}
                </PrimaryButton>
              </div>
              {triliumError && <div className="md:col-span-2"><ErrorState message={triliumError} /></div>}
            </div>
          </IntegrationCard>

          <Surface>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <IconBadge icon={Settings2} tone="amber" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">待办任务</h2>
                  <p className="mt-0.5 text-xs text-slate-500">来自学习计划和仪表盘的任务。</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">{taskItems.length} 项</span>
            </div>
            {taskItems.length === 0 ? (
              <div className="p-5">
                <EmptyState title="暂无任务" description="创建学习计划后，这里会展示待办任务。" icon={CheckCircle2} />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                {taskItems.map((task: any, index: number) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.18) }}
                    whileHover={{ x: 3 }}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={(event) => toggle(task.id, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-medium ${task.done ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</div>
                      {task.due_date && <div className="mt-0.5 text-xs text-slate-400">{new Date(task.due_date).toLocaleDateString("zh-CN")}</div>}
                    </div>
                    <SecondaryButton
                      className="h-9 px-3 text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                      onClick={() => setDeletingTask(task)}
                    >
                      <Trash2 size={15} />
                    </SecondaryButton>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            )}
          </Surface>
        </div>
      </div>

      <AnimatePresence>
        {deletingTask && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setDeletingTask(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">删除待办任务</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">确认删除这个任务？删除后不会再出现在仪表盘和个人中心。</p>
                  </div>
                  <button onClick={() => setDeletingTask(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-900">{deletingTask.title}</div>
                  {deletingTask.due_date && <div className="mt-1 text-xs text-slate-400">{new Date(deletingTask.due_date).toLocaleDateString("zh-CN")}</div>}
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <SecondaryButton type="button" onClick={() => setDeletingTask(null)}>取消</SecondaryButton>
                  <PrimaryButton
                    type="button"
                    className="bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-300"
                    disabled={deleteTaskMut.isPending}
                    onClick={confirmDeleteTask}
                  >
                    <Trash2 size={16} />
                    {deleteTaskMut.isPending ? "删除中..." : "删除"}
                  </PrimaryButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function IntegrationCard({
  title,
  description,
  icon,
  connected,
  connectedTitle,
  connectedSubtitle,
  onDisconnect,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Cloud;
  connected: boolean;
  connectedTitle?: string;
  connectedSubtitle?: string;
  onDisconnect: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
    <Surface className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <IconBadge icon={icon} tone={connected ? "emerald" : "slate"} />
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {connected ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-emerald-100 bg-emerald-50 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">{connectedTitle || "已连接"}</div>
              {connectedSubtitle && <div className="mt-0.5 truncate text-xs text-slate-500">{connectedSubtitle}</div>}
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">已连接</span>
          </div>
          <button onClick={onDisconnect} className="mt-4 text-sm font-medium text-rose-600 hover:text-rose-700">断开连接</button>
        </motion.div>
      ) : (
        children
      )}
    </Surface>
    </motion.div>
  );
}
