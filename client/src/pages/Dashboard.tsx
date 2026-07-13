import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircle,
  Sparkles,
  Route,
} from "lucide-react";
import { useDashboard, useToggleTask } from "../hooks/api";
import { useMutationToast } from "../components/ui/toast";
import { PageSkeleton } from "../components/skeleton/Skeletons";
import {
  EmptyState,
  ErrorState,
  IconBadge,
  PageShell,
  PrimaryButton,
  SectionTitle,
  Surface,
} from "../components/PageScaffold";
import { preloadPage } from "../pageLoaders";
import Counter from "../components/Counter";
import SpotlightCard from "../components/SpotlightCard";

function MetricCounter({ value, suffix }: { value: number; suffix?: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5" aria-label={`${value}${suffix ?? ""}`}>
      <Counter
        value={Math.max(0, Math.round(Number(value) || 0))}
        fontSize={24}
        padding={2}
        gap={1}
        horizontalPadding={0}
        fontWeight={600}
        gradientHeight={5}
        gradientFrom="rgba(255,255,255,0.98)"
        gradientTo="rgba(255,255,255,0)"
      />
      {suffix && <span aria-hidden>{suffix}</span>}
    </span>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();
  const toggleMut = useToggleTask();
  const toast = useMutationToast();
  const navigate = useNavigate();

  async function toggleTask(id: number, done: boolean) {
    try {
      await toggleMut.mutateAsync({ id, done });
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    }
  }

  if (error) {
    return (
      <PageShell title="学习仪表盘" description="汇总课程、资料、任务与最近对话。">
        <ErrorState message={(error as Error).message} />
      </PageShell>
    );
  }
  if (isLoading || !data) return <PageSkeleton lines={6} />;

  const totalTasks = data.total_tasks || 0;
  const rate = totalTasks > 0 ? Math.round((data.completed_tasks / totalTasks) * 100) : 0;
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <PageShell
      title="学习仪表盘"
      eyebrow={today}
      description="把今日待办、课程进展和最近对话放在一个工作台里，减少来回切换。"
    >
      <LearningCommandCenter
        todayTasks={data.today_tasks.length}
        upcomingTasks={data.upcoming_tasks.length}
        recentSessions={data.recent_sessions.length}
        courseCount={data.course_count}
        materialCount={data.material_count}
        completionRate={rate}
        completedTasks={data.completed_tasks}
        totalTasks={totalTasks}
        planCount={data.plan_count}
        onTodayAction={() => {
          if (data.today_tasks.length) scrollToSection("dashboard-today");
          else scrollToSection("dashboard-plans");
        }}
        onUpcomingAction={() => {
          if (data.upcoming_tasks.length) scrollToSection("dashboard-upcoming");
          else scrollToSection("dashboard-plans");
        }}
        onRecentAction={() => {
          if (data.recent_sessions.length) scrollToSection("dashboard-recent");
          else navigate("/chat");
        }}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Surface id="dashboard-today" className="scroll-mt-6">
            <SectionTitle title={`今日待办 (${data.today_tasks.length})`} description="按优先级处理当天需要完成的任务。" />
            {data.today_tasks.length === 0 ? (
              <div className="p-5">
                <EmptyState title="今天没有待办" description="可以去学习计划里生成新的学习节奏。" icon={CheckCircle2} />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {data.today_tasks.map((task: any, index: number) => (
                    <TaskRow key={task.id} task={task} index={index} onToggle={toggleTask} highlight />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Surface>

          <Surface id="dashboard-upcoming" className="scroll-mt-6">
            <SectionTitle title={`即将到期 (${data.upcoming_tasks.length})`} description="未来 7 天内需要注意的任务。" />
            {data.upcoming_tasks.length === 0 ? (
              <div className="p-5">
                <EmptyState title="近期没有到期任务" description="当前节奏比较轻，可以补充课程资料或整理知识库。" icon={Clock3} />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {data.upcoming_tasks.map((task: any, index: number) => (
                    <TaskRow key={task.id} task={task} index={index} onToggle={toggleTask} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Surface>
        </div>

        <div className="space-y-6">
          <Surface id="dashboard-recent" className="scroll-mt-6">
            <SectionTitle title="最近对话" description="继续刚才和课程助手的讨论。" />
            {data.recent_sessions.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="暂无对话记录"
                  description="创建一个课程对话，让 Agent 帮你梳理知识点。"
                  icon={MessageCircle}
                  action={
                    <PrimaryButton
                      onMouseEnter={() => preloadPage("chat")}
                      onFocus={() => preloadPage("chat")}
                      onClick={() => navigate("/chat")}
                    >
                      开始对话
                    </PrimaryButton>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recent_sessions.map((session: any, index: number) => (
                  <motion.button
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
                    whileHover={{ x: 3 }}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50"
                    onMouseEnter={() => preloadPage("chat")}
                    onFocus={() => preloadPage("chat")}
                    onClick={() => navigate(`/chat/${session.id}`)}
                  >
                    <IconBadge icon={MessageCircle} tone="slate" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{session.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{formatDate(session.created_at)}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </Surface>

          <Surface id="dashboard-plans" className="scroll-mt-6">
            <SectionTitle
              title={`学习计划 (${data.active_plans.length})`}
              description="正在推进的目标和每日投入。"
              action={
                data.active_plans.length > 0 ? (
                  <Link
                    className="text-xs font-medium text-slate-500 hover:text-slate-950"
                    to="/plan"
                    onMouseEnter={() => preloadPage("plan")}
                    onFocus={() => preloadPage("plan")}
                  >
                    管理全部
                  </Link>
                ) : null
              }
            />
            {data.active_plans.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="还没有学习计划"
                  description="给一个课程目标设置截止时间和每日投入。"
                  icon={Route}
                  action={
                    <PrimaryButton
                      onMouseEnter={() => preloadPage("plan")}
                      onFocus={() => preloadPage("plan")}
                      onClick={() => navigate("/plan")}
                    >
                      创建计划
                    </PrimaryButton>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.active_plans.map((plan: any, index: number) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
                    whileHover={{ x: 3 }}
                    className="px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="text-sm font-semibold text-slate-900">{plan.goal}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">每日 {plan.daily_minutes} 分钟</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        截止 {plan.deadline ? formatDate(plan.deadline) : "未设置"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Surface>

          {data.upcoming_assignments && data.upcoming_assignments.length > 0 && (
            <Surface id="dashboard-assignments" className="scroll-mt-6">
              <SectionTitle
                title={`即将到期的作业 (${data.upcoming_assignments.length})`}
                description="标记为「课程作业」且设定了截止日期的资料。"
              />
              <div className="divide-y divide-slate-100">
                {data.upcoming_assignments.map((item: any, index: number) => {
                  const due = item.due_date ? new Date(item.due_date) : null;
                  const daysLeft = due
                    ? Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <IconBadge
                        icon={FileText}
                        tone={daysLeft !== null && daysLeft <= 3 ? "rose" : daysLeft !== null && daysLeft <= 7 ? "amber" : "slate"}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{item.filename}</span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {due ? `${due.toLocaleDateString("zh-CN")} 截止` : "无截止日期"}
                          {daysLeft !== null && (
                            <span className={daysLeft <= 3 ? "text-rose-500 ml-1" : daysLeft <= 7 ? "text-amber-500 ml-1" : "ml-1"}>
                              · {daysLeft <= 0 ? "今天到期" : `还剩 ${daysLeft} 天`}
                            </span>
                          )}
                        </span>
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </Surface>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function LearningCommandCenter({
  todayTasks,
  upcomingTasks,
  recentSessions,
  courseCount,
  materialCount,
  completionRate,
  completedTasks,
  totalTasks,
  planCount,
  onTodayAction,
  onUpcomingAction,
  onRecentAction,
}: {
  todayTasks: number;
  upcomingTasks: number;
  recentSessions: number;
  courseCount: number;
  materialCount: number;
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
  planCount: number;
  onTodayAction: () => void;
  onUpcomingAction: () => void;
  onRecentAction: () => void;
}) {
  const focus =
    todayTasks > 0
      ? {
          title: "先清理今日待办",
          description: `今天还有 ${todayTasks} 个任务需要处理，下面的待办列表已经按当前节奏放好。`,
        }
      : upcomingTasks > 0
        ? {
            title: "关注近期截止",
            description: `${upcomingTasks} 个任务即将到期，可以先检查下面的截止列表。`,
          }
        : recentSessions > 0
          ? {
              title: "适合继续复盘",
              description: `最近有 ${recentSessions} 条对话记录，可以从下方继续整理问题和结论。`,
            }
          : {
              title: "今天节奏很轻",
              description: "当前没有紧急任务，可以补充课程资料或整理知识库结构。",
          };

  const metrics = [
    {
      label: "课程",
      value: <MetricCounter value={courseCount} />,
      hint: "正在管理的课程",
      icon: BookOpen,
      tone: "blue" as const,
    },
    {
      label: "学习资料",
      value: <MetricCounter value={materialCount} />,
      hint: "已归档的课程资料",
      icon: FileText,
      tone: "emerald" as const,
    },
    {
      label: "任务完成率",
      value: <MetricCounter value={completionRate} suffix="%" />,
      hint: `${completedTasks}/${totalTasks} 个任务已完成`,
      icon: CheckCircle2,
      tone: "violet" as const,
      progress: completionRate,
    },
    {
      label: "学习计划",
      value: <MetricCounter value={planCount} />,
      hint: "活跃计划与目标",
      icon: CalendarClock,
      tone: "amber" as const,
    },
  ];

  const primaryAction = todayTasks > 0 ? onTodayAction : upcomingTasks > 0 ? onUpcomingAction : onRecentAction;
  const primaryLabel = todayTasks > 0 ? "进入待办" : upcomingTasks > 0 ? "查看截止" : "继续对话";

  return (
    <SpotlightCard
      radius={360}
      color="rgba(15,23,42,0.08)"
      className="overflow-hidden rounded-3xl border border-white/80 bg-white/82 shadow-[0_18px_54px_rgba(15,23,42,0.10)] backdrop-blur"
    >
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(15,23,42,0.055),transparent_28rem),linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,250,252,0.48)_58%,rgba(226,232,240,0.32))]" />
      </div>
      <div className="relative grid gap-6 p-5 text-slate-950 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:p-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm backdrop-blur">
            <Sparkles size={14} />
            下一步
          </div>
          <h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            {focus.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            {focus.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PrimaryButton
              type="button"
              onClick={primaryAction}
              onMouseEnter={() => !todayTasks && !upcomingTasks && preloadPage("chat")}
              onFocus={() => !todayTasks && !upcomingTasks && preloadPage("chat")}
            >
              <ArrowRight size={15} />
              {primaryLabel}
            </PrimaryButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((item, index) => (
            <DashboardMetricTile
              key={item.label}
              label={item.label}
              value={item.value}
              hint={item.hint}
              icon={item.icon}
              tone={item.tone}
              progress={item.progress}
              index={index}
            />
          ))}
        </div>
      </div>
    </SpotlightCard>
  );
}

function DashboardMetricTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  progress,
  index,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: typeof BookOpen;
  tone: "blue" | "emerald" | "violet" | "amber";
  progress?: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.16) }}
      className="rounded-2xl border border-slate-200/80 bg-white/72 p-4 shadow-sm backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
        </div>
        <IconBadge icon={Icon} tone={tone} />
      </div>
      <div className="mt-3 text-sm text-slate-500">{hint}</div>
      {progress !== undefined && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}
    </motion.div>
  );
}

function TaskRow({
  task,
  index = 0,
  onToggle,
  highlight,
}: {
  task: any;
  index?: number;
  onToggle: (id: number, done: boolean) => void;
  highlight?: boolean;
}) {
  return (
    <motion.label
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.18) }}
      whileHover={{ x: 3 }}
      className="flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-slate-950"
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-medium ${task.done ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</span>
        {task.due_date && <span className="mt-0.5 block text-xs text-slate-400">{highlight ? "今日到期" : "截止"} {formatDate(task.due_date)}</span>}
      </span>
    </motion.label>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  } catch {
    return value;
  }
}
