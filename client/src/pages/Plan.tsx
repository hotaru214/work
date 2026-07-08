import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Clock3, Plus, Route, Search, Trash2, X } from "lucide-react";
import { useCreatePlan, useDeletePlan, usePlans } from "../hooks/api";
import { GooeyInput } from "../components/ui/gooey-input";
import {
  EmptyState,
  ErrorState,
  IconBadge,
  MetricCard,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  Surface,
  TextAreaField,
  TextField,
} from "../components/PageScaffold";

export default function Plan() {
  const { data: plans = [], isLoading: loading, error } = usePlans();
  const createPlanMut = useCreatePlan();
  const deletePlanMut = useDeletePlan();
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [daily, setDaily] = useState(60);
  const [deletingPlan, setDeletingPlan] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState<"all" | "scheduled" | "week" | "unscheduled">("all");

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await createPlanMut.mutateAsync({
        goal,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        daily_minutes: Number(daily),
      });
      setGoal("");
      setDeadline("");
      setDaily(60);
    } catch {
      // Mutation error is surfaced through createPlanMut.error below.
    }
  }

  async function deletePlan(id: number) {
    try {
      await deletePlanMut.mutateAsync(id);
      setDeletingPlan(null);
    } catch {
      // Mutation error is surfaced through deletePlanMut.error below.
    }
  }

  const pageError = error || createPlanMut.error || deletePlanMut.error;
  const pageErrorMessage = pageError instanceof Error ? pageError.message : pageError ? "操作失败" : "";

  const totalMinutes = plans.reduce((sum, item) => sum + Number(item.daily_minutes || 0), 0);
  const nextDeadline = plans
    .filter((item) => item.deadline)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
  const weekDeadlineCount = plans.filter((item) => item.deadline && isWithinDays(item.deadline, 7)).length;
  const unscheduledCount = plans.filter((item) => !item.deadline).length;
  const filteredPlans = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return plans.filter((plan) => {
      if (deadlineFilter === "scheduled" && !plan.deadline) return false;
      if (deadlineFilter === "unscheduled" && plan.deadline) return false;
      if (deadlineFilter === "week" && (!plan.deadline || !isWithinDays(plan.deadline, 7))) return false;
      if (!keyword) return true;
      return [plan.goal, plan.deadline, String(plan.daily_minutes ?? "")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [plans, search, deadlineFilter]);

  return (
    <PageShell
      title="学习计划"
      description="为阶段目标设置截止时间和每日投入，后续任务可以围绕计划拆解。"
      actions={<div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">共 {plans.length} 个计划</div>}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="计划数量" value={plans.length} hint="当前正在追踪" icon={Route} tone="blue" />
        <MetricCard label="每日投入" value={`${totalMinutes} 分钟`} hint="所有计划累计" icon={Clock3} tone="emerald" />
        <MetricCard label="最近截止" value={nextDeadline ? formatDate(nextDeadline.deadline) : "未设置"} hint={`${weekDeadlineCount} 个计划 7 天内到期，${unscheduledCount} 个未设截止`} icon={CalendarClock} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
        <Surface className="h-fit p-5">
          <div className="mb-5 flex items-center gap-3">
            <IconBadge icon={Plus} tone="slate" />
            <div>
              <h2 className="text-sm font-semibold text-slate-950">生成新计划</h2>
              <p className="mt-0.5 text-xs text-slate-500">填写目标、截止时间和每日可投入时间。</p>
            </div>
          </div>
          <form onSubmit={onCreate} className="space-y-3">
            <TextAreaField
              rows={4}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="如：两周复习完高数期末重点"
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <TextField type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <TextField type="number" min={5} value={daily} onChange={(e) => setDaily(Number(e.target.value))} />
            </div>
            <PrimaryButton type="submit" disabled={createPlanMut.isPending} className="w-full">
              <Plus size={16} />
              {createPlanMut.isPending ? "生成中..." : "生成计划"}
            </PrimaryButton>
          </form>
        </Surface>

        <div className="space-y-4">
          {pageErrorMessage && <ErrorState message={pageErrorMessage} />}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Surface key={index} className="h-28 animate-pulse bg-white" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <EmptyState title="暂无学习计划" description="创建第一个计划后，这里会展示目标、截止时间和每日投入。" icon={Route} />
          ) : (
            <>
              <Surface className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-950">计划列表</div>
                  <div className="mt-1 text-xs text-slate-500">
                    当前显示 {filteredPlans.length} / {plans.length} 个计划
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <PlanFilterChip active={deadlineFilter === "all"} onClick={() => setDeadlineFilter("all")}>全部</PlanFilterChip>
                    <PlanFilterChip active={deadlineFilter === "scheduled"} onClick={() => setDeadlineFilter("scheduled")}>已设截止</PlanFilterChip>
                    <PlanFilterChip active={deadlineFilter === "week"} onClick={() => setDeadlineFilter("week")}>本周到期</PlanFilterChip>
                    <PlanFilterChip active={deadlineFilter === "unscheduled"} onClick={() => setDeadlineFilter("unscheduled")}>未设截止</PlanFilterChip>
                  </div>
                  <GooeyInput
                    placeholder="搜索学习目标..."
                    collapsedLabel="搜索"
                    value={search}
                    onValueChange={setSearch}
                    collapsedWidth={104}
                    expandedWidth={250}
                    expandedOffset={50}
                    classNames={{
                      root: "justify-start sm:justify-end",
                      trigger: "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900 hover:bg-slate-800",
                      bubbleSurface: "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900",
                      input: "text-white placeholder:text-white/55",
                    }}
                  />
                </div>
              </Surface>

              {filteredPlans.length === 0 ? (
                <EmptyState title="没有匹配计划" description="换个关键词或切换截止时间筛选后再试。" icon={Search} />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {filteredPlans.map((plan, index) => (
                      <motion.div
                        key={plan.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -18 }}
                        transition={{ duration: 0.24, delay: Math.min(index * 0.035, 0.22), ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -4 }}
                      >
                        <Surface className="group relative overflow-hidden p-5 transition hover:border-slate-300 hover:shadow-md">
                          <span className="pointer-events-none absolute inset-x-5 top-0 h-px scale-x-0 bg-violet-500/50 transition duration-300 group-hover:scale-x-100" />
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="mb-3 flex items-center gap-2">
                                <IconBadge icon={Route} tone="violet" />
                                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600">学习目标</span>
                                <DeadlineBadge deadline={plan.deadline} />
                              </div>
                              <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-950">{plan.goal}</h3>
                            </div>
                            <SecondaryButton className="h-9 px-3 text-rose-600 hover:border-rose-200 hover:bg-rose-50" onClick={() => setDeletingPlan(plan)}>
                              <Trash2 size={15} />
                            </SecondaryButton>
                          </div>
                          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                            <div className="rounded-lg bg-slate-50 p-3">
                              <div className="text-slate-400">截止时间</div>
                              <div className="mt-1 font-medium text-slate-800">{plan.deadline ? formatDate(plan.deadline) : "未设置"}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <div className="text-slate-400">每日投入</div>
                              <div className="mt-1 font-medium text-slate-800">{plan.daily_minutes} 分钟</div>
                            </div>
                          </div>
                        </Surface>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {deletingPlan && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setDeletingPlan(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">删除学习计划</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">确认删除这个计划？相关任务不会在这里继续展示。</p>
                </div>
                <button onClick={() => setDeletingPlan(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{deletingPlan.goal}</div>
              <div className="mt-5 flex justify-end gap-3">
                <SecondaryButton type="button" onClick={() => setDeletingPlan(null)}>取消</SecondaryButton>
                <PrimaryButton
                  type="button"
                  className="bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-300"
                  disabled={deletePlanMut.isPending}
                  onClick={() => deletePlan(deletingPlan.id)}
                >
                  <Trash2 size={16} />
                  {deletePlanMut.isPending ? "删除中..." : "删除"}
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function isWithinDays(value: string, days: number) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  const now = Date.now();
  return time >= now && time <= now + days * 24 * 60 * 60 * 1000;
}

function DeadlineBadge({ deadline }: { deadline?: string | null }) {
  if (!deadline) {
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">未设截止</span>;
  }
  const deadlineTime = new Date(deadline).getTime();
  const isOverdue = Number.isFinite(deadlineTime) && deadlineTime < Date.now();
  const isSoon = isWithinDays(deadline, 7);
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        isOverdue
          ? "bg-rose-50 text-rose-600"
          : isSoon
            ? "bg-amber-50 text-amber-600"
            : "bg-emerald-50 text-emerald-600"
      }`}
    >
      {isOverdue ? "已过期" : isSoon ? "本周到期" : "已设截止"}
    </span>
  );
}

function PlanFilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950"
      }`}
    >
      {children}
    </motion.button>
  );
}
