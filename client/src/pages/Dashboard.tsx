import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircle,
  Route,
} from "lucide-react";
import { useDashboard, useToggleTask } from "../hooks/api";
import { useMutationToast } from "../components/ui/toast";
import { PageSkeleton } from "../components/skeleton/Skeletons";
import {
  EmptyState,
  ErrorState,
  IconBadge,
  MetricCard,
  PageShell,
  PrimaryButton,
  SectionTitle,
  Surface,
} from "../components/PageScaffold";

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

  return (
    <PageShell
      title="学习仪表盘"
      eyebrow={today}
      description="把今日待办、课程进展和最近对话放在一个工作台里，减少来回切换。"
      actions={
        <PrimaryButton onClick={() => navigate("/plan")}>
          <Route size={16} />
          新建计划
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="课程" value={data.course_count} hint="正在管理的课程" icon={BookOpen} tone="blue" />
        <MetricCard label="学习资料" value={data.material_count} hint="已归档的课程资料" icon={FileText} tone="emerald" />
        <MetricCard
          label="任务完成率"
          value={`${rate}%`}
          hint={`${data.completed_tasks}/${totalTasks} 个任务已完成`}
          icon={CheckCircle2}
          tone="violet"
          progress={rate}
        />
        <MetricCard label="学习计划" value={data.plan_count} hint="活跃计划与目标" icon={CalendarClock} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Surface>
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

          <Surface>
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
          <Surface>
            <SectionTitle title="最近对话" description="继续刚才和课程助手的讨论。" />
            {data.recent_sessions.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="暂无对话记录"
                  description="创建一个课程对话，让 Agent 帮你梳理知识点。"
                  icon={MessageCircle}
                  action={<PrimaryButton onClick={() => navigate("/chat")}>开始对话</PrimaryButton>}
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

          <Surface>
            <SectionTitle
              title={`学习计划 (${data.active_plans.length})`}
              description="正在推进的目标和每日投入。"
              action={<Link className="text-xs font-medium text-slate-500 hover:text-slate-950" to="/plan">查看全部</Link>}
            />
            {data.active_plans.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="还没有学习计划"
                  description="给一个课程目标设置截止时间和每日投入。"
                  icon={Route}
                  action={<PrimaryButton onClick={() => navigate("/plan")}>创建计划</PrimaryButton>}
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
        </div>
      </div>
    </PageShell>
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
