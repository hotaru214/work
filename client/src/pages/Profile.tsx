import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  MessageCircle,
  Plus,
  Route,
  Settings2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { api, resolveAssetUrl } from "../api/client";
import {
  useCourses,
  useDeleteCourse,
  useDeletePlan,
  useDeleteTask,
  useMe,
  usePlans,
  useSessions,
  useTasks,
  useToggleTask,
} from "../hooks/api";
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
import { preloadPage } from "../pageLoaders";

type DeleteTarget =
  | { type: "course"; id: number; title: string; detail?: string }
  | { type: "session"; id: number; title: string; detail?: string }
  | { type: "plan"; id: number; title: string; detail?: string }
  | { type: "task"; id: number; title: string; detail?: string };

const taskFilters = [
  { key: "all", label: "全部" },
  { key: "active", label: "未完成" },
  { key: "done", label: "已完成" },
] as const;

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useMutationToast();

  const { data: me } = useMe();
  const { data: courses = [] } = useCourses();
  const { data: sessions = [] } = useSessions();
  const { data: plans = [] } = usePlans();
  const { data: tasks = [] } = useTasks();

  const toggleTaskMut = useToggleTask();
  const deleteTaskMut = useDeleteTask();
  const deleteCourseMut = useDeleteCourse();
  const deletePlanMut = useDeletePlan();

  const [nickname, setNickname] = useState("学习者");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [taskFilter, setTaskFilter] = useState<(typeof taskFilters)[number]["key"]>("all");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const taskItems = tasks ?? [];
  const completedTasks = taskItems.filter((item: any) => item.done).length;
  const activeTasks = taskItems.length - completedTasks;
  const taskCompletionRate = taskItems.length ? Math.round((completedTasks / taskItems.length) * 100) : 0;
  const filteredTasks = taskItems.filter((item: any) => {
    if (taskFilter === "active") return !item.done;
    if (taskFilter === "done") return item.done;
    return true;
  });
  const pendingPlans = plans.filter((plan: any) => !plan.deadline || new Date(plan.deadline).getTime() >= Date.now());
  const recentSessions = sessions.slice(0, 6);
  const hasProfileChanges = !!avatarFile || nickname !== (me?.nickname || "学习者");

  const courseById = useMemo(() => {
    const map = new Map<number, any>();
    courses.forEach((course: any) => map.set(course.id, course));
    return map;
  }, [courses]);

  useEffect(() => {
    if (me) setNickname(me.nickname || "学习者");
  }, [me]);

  async function toggleTask(id: number, done: boolean) {
    try {
      await toggleTaskMut.mutateAsync({ id, done });
    } catch (e: any) {
      toast.error(e.message || "操作失败");
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "course") {
        await deleteCourseMut.mutateAsync(deleteTarget.id);
        toast.success("课程已删除");
      } else if (deleteTarget.type === "session") {
        await api.deleteSession(deleteTarget.id);
        queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        toast.success("对话记录已删除");
      } else if (deleteTarget.type === "plan") {
        await deletePlanMut.mutateAsync(deleteTarget.id);
        toast.success("学习计划已删除");
      } else {
        await deleteTaskMut.mutateAsync(deleteTarget.id);
        toast.success("待办任务已删除");
      }
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageShell
      title="个人中心"
      description="集中管理你的账号资料、课程、对话记录、学习计划和待办任务。"
    >
      <ProfileOverview
        me={me}
        nickname={nickname}
        avatarPreview={avatarPreview}
        taskCompletionRate={taskCompletionRate}
        activeTasks={activeTasks}
        courseCount={courses.length}
        planCount={plans.length}
        sessionCount={sessions.length}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="课程" value={courses.length} hint="可继续学习或管理" icon={BookOpen} tone="blue" />
        <MetricCard label="对话" value={sessions.length} hint={`${recentSessions.length} 条最近记录`} icon={MessageCircle} tone="slate" />
        <MetricCard label="计划" value={plans.length} hint={`${pendingPlans.length} 个进行中`} icon={Route} tone="violet" />
        <MetricCard label="待办" value={taskItems.length} hint={`${completedTasks} 个已完成`} icon={CheckCircle2} tone="emerald" progress={taskCompletionRate} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ResourcePanel
          title="我的课程"
          description="查看课程详情、资料和课程对话。"
          icon={BookOpen}
          count={courses.length}
          emptyTitle="暂无课程"
          emptyDescription="添加课程后可以在这里快速进入和管理。"
          emptyAction={
            <PrimaryButton onClick={() => navigate("/courses")}>
              <Plus size={16} />
              添加课程
            </PrimaryButton>
          }
          action={<QuickLink to="/courses" label="管理全部" />}
        >
          {courses.map((course: any, index: number) => (
            <ResourceRow
              key={course.id}
              index={index}
              icon={BookOpen}
              title={course.name}
              meta={[course.teacher, course.semester].filter(Boolean).join(" · ") || "未设置教师和学期"}
              description={course.intro || "暂无课程简介"}
              primaryLabel="进入课程"
              onPrimary={() => navigate(`/courses/${course.id}`)}
              onDelete={() =>
                setDeleteTarget({
                  type: "course",
                  id: course.id,
                  title: course.name,
                  detail: "删除课程会连同课程资料和课程对话一起移除。",
                })
              }
            />
          ))}
        </ResourcePanel>

        <ResourcePanel
          title="对话记录"
          description="继续最近的 Agent 学习对话。"
          icon={MessageCircle}
          count={sessions.length}
          emptyTitle="暂无对话记录"
          emptyDescription="创建课程对话后，这里会保留你的上下文。"
          emptyAction={
            <PrimaryButton onClick={() => navigate("/chat")}>
              <Plus size={16} />
              开始对话
            </PrimaryButton>
          }
          action={<QuickLink to="/chat" label="打开对话" />}
        >
          {recentSessions.map((session: any, index: number) => {
            const course = session.course_id ? courseById.get(session.course_id) : null;
            return (
              <ResourceRow
                key={session.id}
                index={index}
                icon={MessageCircle}
                title={session.title || "新对话"}
                meta={course ? `关联课程：${course.name}` : "未关联课程"}
                description={`创建于 ${formatDateTime(session.created_at)}`}
                primaryLabel="继续"
                onPrimary={() => navigate(`/chat/${session.id}`)}
                onDelete={() =>
                  setDeleteTarget({
                    type: "session",
                    id: session.id,
                    title: session.title || "新对话",
                    detail: "删除后，该对话中的历史消息也会被移除。",
                  })
                }
              />
            );
          })}
        </ResourcePanel>

        <ResourcePanel
          title="学习计划"
          description="查看目标、截止时间和每日投入。"
          icon={Route}
          count={plans.length}
          emptyTitle="暂无学习计划"
          emptyDescription="创建计划后会自动拆解待办任务。"
          emptyAction={
            <PrimaryButton onClick={() => navigate("/plan")}>
              <Plus size={16} />
              创建计划
            </PrimaryButton>
          }
          action={<QuickLink to="/plan" label="管理计划" />}
        >
          {plans.map((plan: any, index: number) => (
            <ResourceRow
              key={plan.id}
              index={index}
              icon={CalendarClock}
              title={plan.goal}
              meta={`每日 ${plan.daily_minutes} 分钟`}
              description={plan.deadline ? `截止 ${formatDateTime(plan.deadline)}` : "未设置截止时间"}
              primaryLabel="查看"
              onPrimary={() => navigate("/plan")}
              onDelete={() =>
                setDeleteTarget({
                  type: "plan",
                  id: plan.id,
                  title: plan.goal,
                  detail: "删除计划后，由计划生成的待办会保留当前状态。",
                })
              }
            />
          ))}
        </ResourcePanel>

        <TaskPanel
          tasks={taskItems}
          filteredTasks={filteredTasks}
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          taskCompletionRate={taskCompletionRate}
          taskFilter={taskFilter}
          onFilterChange={setTaskFilter}
          onToggle={toggleTask}
          onDelete={(task) =>
            setDeleteTarget({
              type: "task",
              id: task.id,
              title: task.title,
              detail: task.due_date ? `截止 ${formatDateTime(task.due_date)}` : undefined,
            })
          }
        />
      </div>

      <DeleteConfirmDialog
        target={deleteTarget}
        deleting={deleting || deleteTaskMut.isPending || deleteCourseMut.isPending || deletePlanMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}

function ResourcePanel({
  title,
  description,
  icon,
  count,
  emptyTitle,
  emptyDescription,
  emptyAction,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: typeof BookOpen;
  count: number;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={icon} tone="slate" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">{count} 项</span>
          {action}
        </div>
      </div>
      {count === 0 ? (
        <div className="p-5">
          <EmptyState title={emptyTitle} description={emptyDescription} icon={icon} action={emptyAction} />
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">{children}</div>
      )}
    </Surface>
  );
}

function ResourceRow({
  icon,
  title,
  meta,
  description,
  primaryLabel,
  index,
  onPrimary,
  onDelete,
}: {
  icon: typeof BookOpen;
  title: string;
  meta: string;
  description?: string;
  primaryLabel: string;
  index: number;
  onPrimary: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.18) }}
      whileHover={{ x: 3 }}
      className="group flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
    >
      <IconBadge icon={icon} tone="slate" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-950">{title}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{meta}</div>
        {description && <div className="mt-1 line-clamp-1 text-xs text-slate-400">{description}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SecondaryButton className="h-9 px-3" onClick={onPrimary}>
          <ArrowRight size={15} />
          {primaryLabel}
        </SecondaryButton>
        <SecondaryButton
          className="h-9 px-3 text-rose-600 opacity-100 transition hover:border-rose-200 hover:bg-rose-50 md:opacity-0 md:group-hover:opacity-100"
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </SecondaryButton>
      </div>
    </motion.div>
  );
}

function TaskPanel({
  tasks,
  filteredTasks,
  activeTasks,
  completedTasks,
  taskCompletionRate,
  taskFilter,
  onFilterChange,
  onToggle,
  onDelete,
}: {
  tasks: any[];
  filteredTasks: any[];
  activeTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  taskFilter: (typeof taskFilters)[number]["key"];
  onFilterChange: (filter: (typeof taskFilters)[number]["key"]) => void;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (task: any) => void;
}) {
  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={Settings2} tone="amber" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-950">待办任务</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">来自学习计划和仪表盘的任务。</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">{tasks.length} 项</span>
      </div>

      {tasks.length === 0 ? (
        <div className="p-5">
          <EmptyState title="暂无任务" description="创建学习计划后，这里会展示待办任务。" icon={CheckCircle2} />
        </div>
      ) : (
        <>
          <div className="space-y-4 border-b border-slate-100 px-5 py-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>完成进度</span>
                <span>{completedTasks}/{tasks.length}</span>
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
              {taskFilters.map((item) => {
                const count = item.key === "all" ? tasks.length : item.key === "active" ? activeTasks : completedTasks;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onFilterChange(item.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      taskFilter === item.key
                        ? "bg-slate-950 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {item.label} {count}
                  </button>
                );
              })}
            </div>
          </div>
          {filteredTasks.length === 0 ? (
            <div className="p-5">
              <EmptyState title="没有匹配任务" description="切换筛选条件查看其它任务。" icon={CheckCircle2} />
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
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
                      onChange={(event) => onToggle(task.id, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-medium ${task.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                        {task.title}
                      </div>
                      {task.due_date && <div className="mt-0.5 text-xs text-slate-400">{formatDateTime(task.due_date)}</div>}
                    </div>
                    <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${task.done ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {task.done ? "已完成" : "进行中"}
                    </span>
                    <SecondaryButton
                      className="h-9 px-3 text-rose-600 opacity-100 transition hover:border-rose-200 hover:bg-rose-50 md:opacity-0 md:group-hover:opacity-100"
                      onClick={() => onDelete(task)}
                    >
                      <Trash2 size={15} />
                    </SecondaryButton>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </Surface>
  );
}

function DeleteConfirmDialog({
  target,
  deleting,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {target && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={onCancel}
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
                  <h2 className="text-lg font-semibold text-slate-950">确认删除</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{target.detail || "删除后不会再出现在个人中心。"}</p>
                </div>
                <button onClick={onCancel} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="line-clamp-2 text-sm font-medium text-slate-900">{target.title}</div>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <SecondaryButton type="button" onClick={onCancel}>取消</SecondaryButton>
                <PrimaryButton type="button" tone="danger" disabled={deleting} onClick={onConfirm}>
                  <Trash2 size={16} />
                  {deleting ? "删除中..." : "删除"}
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProfileOverview({
  me,
  nickname,
  avatarPreview,
  taskCompletionRate,
  activeTasks,
  courseCount,
  planCount,
  sessionCount,
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
  planCount: number;
  sessionCount: number;
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
      <div className="relative grid gap-6 p-5 text-slate-950 lg:grid-cols-[minmax(360px,1fr)_340px] lg:p-6">
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
              <div className="text-xs font-medium text-slate-400">学习空间</div>
              <div className="mt-1 text-sm text-slate-700">课程、对话和计划概览</div>
            </div>
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
              {activeTasks} 项待办
            </span>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <div className="rounded-full bg-white/95 p-2 shadow-[0_16px_42px_rgba(0,0,0,0.18)]">
              <ProgressRing value={taskCompletionRate} className="size-28 text-slate-950" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
            <MiniStat label="课程" value={courseCount} />
            <MiniStat label="对话" value={sessionCount} />
            <MiniStat label="计划" value={planCount} />
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
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

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      onMouseEnter={() => preloadPage(to === "/chat" ? "chat" : to === "/plan" ? "plan" : "courses")}
      onFocus={() => preloadPage(to === "/chat" ? "chat" : to === "/plan" ? "plan" : "courses")}
      className="text-xs font-medium text-slate-500 transition hover:text-slate-950"
    >
      {label}
    </Link>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "未设置";
  try {
    return new Date(value).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
