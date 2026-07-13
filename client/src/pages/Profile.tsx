import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  CheckCircle2,
  Cloud,
  Settings2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { api, resolveAssetUrl } from "../api/client";
import { useCourses, useDeleteTask, useMe, useTasks, useToggleTask } from "../hooks/api";
import { useMutationToast } from "../components/ui/toast";
import { InteractiveHoverButton } from "../components/ui/interactive-hover-button";
import ProgressRing from "../components/ProgressRing";
import SpotlightCard from "../components/SpotlightCard";
import {
  EmptyState,
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
  const [deletingTask, setDeletingTask] = useState<any | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "done">("all");
  const hasProfileChanges = !!avatarFile || nickname !== (me?.nickname || "学习者");
  const courseCount = courses?.length ?? 0;
  const taskItems = tasks ?? [];
  const completedTasks = taskItems.filter((item: any) => item.done).length;
  const activeTasks = taskItems.length - completedTasks;
  const filteredTasks = taskItems.filter((item: any) => {
    if (taskFilter === "active") return !item.done;
    if (taskFilter === "done") return item.done;
    return true;
  });
  const taskCompletionRate = taskItems.length ? Math.round((completedTasks / taskItems.length) * 100) : 0;

  useEffect(() => {
    if (me) setNickname(me.nickname || "学习者");
  }, [me]);

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
    <PageShell title="个人中心" description="管理头像、昵称和个人待办任务。外部连接请在左下角账号菜单的设置中配置。">
      <ProfileOverview
        me={me}
        nickname={nickname}
        avatarPreview={avatarPreview}
        taskCompletionRate={taskCompletionRate}
        activeTasks={activeTasks}
        courseCount={courseCount}
        editingNickname={editingNickname}
        profileSaving={profileSaving}
        profileMessage={profileMessage}
        hasProfileChanges={hasProfileChanges}
        onAvatarChange={(file) => {
          setAvatarFile(file);
          setProfileMessage("");
          if (avatarPreview) URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(file ? URL.createObjectURL(file) : null);
        }}
        onEditNickname={() => setEditingNickname(true)}
        onNicknameChange={(value) => {
          setNickname(value);
          setProfileMessage("");
        }}
        onCancelNicknameEdit={() => {
          setNickname(me?.nickname || "学习者");
          setEditingNickname(false);
        }}
        onSaveProfile={saveProfile}
        onCancelProfileChanges={cancelProfileChanges}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="课程数" value={courseCount} hint="当前学习课程" icon={Cloud} tone="blue" />
        <MetricCard label="任务数" value={taskItems.length} hint={`${completedTasks} 个已完成`} icon={CheckCircle2} tone="emerald" progress={taskCompletionRate} />
        <MetricCard label="进行中" value={activeTasks} hint="仍需处理的任务" icon={Settings2} tone="violet" />
      </div>

      <div className="grid grid-cols-1 gap-6">
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
            <div>
              <div className="space-y-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>完成进度</span>
                    <span>{completedTasks}/{taskItems.length}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full rounded-full bg-slate-950"
                      initial={{ width: 0 }}
                      animate={{ width: `${taskCompletionRate}%` }}
                      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: `全部 ${taskItems.length}` },
                    { key: "active", label: `未完成 ${activeTasks}` },
                    { key: "done", label: `已完成 ${completedTasks}` },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTaskFilter(item.key as "all" | "active" | "done")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        taskFilter === item.key
                          ? "bg-slate-950 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {filteredTasks.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="没有匹配任务" description="切换筛选条件查看其它任务。" icon={CheckCircle2} />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <AnimatePresence initial={false}>
                    {filteredTasks.map((task: any, index: number) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.18) }}
                        whileHover={{ x: 3 }}
                        className="group flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
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
                        <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${task.done ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                          {task.done ? "已完成" : "进行中"}
                        </span>
                        <SecondaryButton
                          className="h-9 px-3 text-rose-600 opacity-0 transition hover:border-rose-200 hover:bg-rose-50 group-hover:opacity-100"
                          onClick={() => setDeletingTask(task)}
                        >
                          <Trash2 size={15} />
                        </SecondaryButton>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </Surface>
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

function ProfileOverview({
  me,
  nickname,
  avatarPreview,
  taskCompletionRate,
  activeTasks,
  courseCount,
  editingNickname,
  profileSaving,
  profileMessage,
  hasProfileChanges,
  onAvatarChange,
  onEditNickname,
  onNicknameChange,
  onCancelNicknameEdit,
  onSaveProfile,
  onCancelProfileChanges,
}: {
  me: any;
  nickname: string;
  avatarPreview: string | null;
  taskCompletionRate: number;
  activeTasks: number;
  courseCount: number;
  editingNickname: boolean;
  profileSaving: boolean;
  profileMessage: string;
  hasProfileChanges: boolean;
  onAvatarChange: (file: File | null) => void;
  onEditNickname: () => void;
  onNicknameChange: (value: string) => void;
  onCancelNicknameEdit: () => void;
  onSaveProfile: () => void;
  onCancelProfileChanges: () => void;
}) {
  return (
    <SpotlightCard
      radius={420}
      color="rgba(15,23,42,0.08)"
      className="overflow-hidden rounded-3xl border border-white/80 bg-white/82 shadow-[0_18px_54px_rgba(15,23,42,0.10)] backdrop-blur"
    >
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(15,23,42,0.06),transparent_28rem),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(248,250,252,0.42)_55%,rgba(226,232,240,0.36))]" />
      </div>
      <div className="relative grid gap-6 p-5 text-slate-950 lg:grid-cols-[minmax(360px,1fr)_300px] lg:p-6">
        <AccountInfoPanel
          me={me}
          nickname={nickname}
          avatarPreview={avatarPreview}
          editingNickname={editingNickname}
          profileSaving={profileSaving}
          profileMessage={profileMessage}
          hasProfileChanges={hasProfileChanges}
          onAvatarChange={onAvatarChange}
          onEditNickname={onEditNickname}
          onNicknameChange={onNicknameChange}
          onCancelNicknameEdit={onCancelNicknameEdit}
          onSaveProfile={onSaveProfile}
          onCancelProfileChanges={onCancelProfileChanges}
        />

        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-400">任务完成率</div>
              <div className="mt-1 text-sm text-slate-700">个人节奏</div>
            </div>
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
              {activeTasks} 项待办
            </span>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <div className="rounded-full bg-white/95 p-2 shadow-[0_16px_42px_rgba(0,0,0,0.24)]">
              <ProgressRing value={taskCompletionRate} className="size-28 text-slate-950" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-slate-400">课程</div>
              <div className="mt-1 text-lg font-semibold">{courseCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-slate-400">待办</div>
              <div className="mt-1 text-lg font-semibold">{activeTasks}</div>
            </div>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}

function AccountInfoPanel({
  me,
  nickname,
  avatarPreview,
  editingNickname,
  profileSaving,
  profileMessage,
  hasProfileChanges,
  onAvatarChange,
  onEditNickname,
  onNicknameChange,
  onCancelNicknameEdit,
  onSaveProfile,
  onCancelProfileChanges,
}: {
  me: any;
  nickname: string;
  avatarPreview: string | null;
  editingNickname: boolean;
  profileSaving: boolean;
  profileMessage: string;
  hasProfileChanges: boolean;
  onAvatarChange: (file: File | null) => void;
  onEditNickname: () => void;
  onNicknameChange: (value: string) => void;
  onCancelNicknameEdit: () => void;
  onSaveProfile: () => void;
  onCancelProfileChanges: () => void;
}) {
  const avatarUrl = avatarPreview || resolveAssetUrl(me?.avatar_url);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/78 p-5 shadow-sm backdrop-blur">
      <div className="mb-5 flex items-center gap-3">
        <IconBadge icon={UserRound} tone="slate" />
        <div>
          <h2 className="text-sm font-semibold text-slate-950">账户信息</h2>
          <p className="mt-0.5 text-xs text-slate-500">头像可点击上传，昵称双击后编辑。</p>
        </div>
      </div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <motion.label
          className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-violet-100 text-3xl font-semibold text-violet-600 ring-1 ring-slate-200 transition hover:ring-violet-300"
          whileHover={{ y: -3, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="头像" className="h-full w-full object-cover" />
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
              onAvatarChange(event.target.files?.[0] ?? null);
              event.target.value = "";
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
                onChange={(event) => onNicknameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onCancelNicknameEdit();
                }}
                placeholder="昵称可重复"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={onEditNickname}
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
                  onClick={onSaveProfile}
                  disabled={profileSaving}
                  hoverIcon={<Check size={18} strokeWidth={2.4} />}
                  hoverDotClassName="bg-emerald-500"
                  className="rounded-lg border-slate-900 bg-white px-5 py-2 text-sm font-medium text-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {profileSaving ? "保存中..." : "保存"}
                </InteractiveHoverButton>
                <InteractiveHoverButton
                  type="button"
                  onClick={onCancelProfileChanges}
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
    </div>
  );
}
