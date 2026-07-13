import { FormEvent, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Clock3, Layers3, Plus, Route, Search, Sparkles, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useCreatePlan, useDeletePlan, usePlans } from "../hooks/api";
import { useMutationToast } from "../components/ui/toast";
import { GooeyInput } from "../components/ui/gooey-input";
import ProgressRing from "../components/ProgressRing";
import SpotlightCard from "../components/SpotlightCard";
import Stack from "../components/Stack";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  EmptyState,
  ErrorState,
  IconBadge,
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
  const queryClient = useQueryClient();
  const toast = useMutationToast();
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [daily, setDaily] = useState(60);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<any | null>(null);
  const [generatingPlanId, setGeneratingPlanId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<any | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
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
      setCreateOpen(false);
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

  async function handleGenerateTasks(planId: number) {
    if (generatingPlanId === planId) return;
    setGeneratingPlanId(planId);
    try {
      const result = await api.generateTasks(planId);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`已生成 ${result.tasks.length} 个任务`);
    } catch (e: any) {
      toast.error(e.message || "生成失败");
    } finally {
      setGeneratingPlanId(null);
    }
  }

  async function handleGenerateIntegratedSchedule() {
    if (scheduleLoading) return;
    setScheduleLoading(true);
    try {
      const result = await api.integratedSchedule(7, Math.max(60, Number(daily || 180)));
      setSchedule(result);
      toast.success("已生成多课程综合安排");
    } catch (e: any) {
      toast.error(e.message || "生成综合安排失败");
    } finally {
      setScheduleLoading(false);
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
  const scheduledRate = plans.length ? Math.round(((plans.length - unscheduledCount) / plans.length) * 100) : 0;
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
  const weeklyQueuePlans = useMemo(
    () =>
      plans
        .filter((plan) => plan.deadline && isWithinDays(plan.deadline, 7))
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 4),
    [plans]
  );
  const focusPlanInList = useCallback((plan: any) => {
    setDeadlineFilter("week");
    setSearch(plan.goal || "");
  }, []);

  return (
    <PageShell
      title="学习计划"
      description="为阶段目标设置截止时间和每日投入，后续任务可以围绕计划拆解。"
      actions={
        <>
          <div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">共 {plans.length} 个计划</div>
          <SecondaryButton onClick={handleGenerateIntegratedSchedule} disabled={scheduleLoading}>
            <Layers3 size={16} />
            {scheduleLoading ? "生成中..." : "综合安排"}
          </SecondaryButton>
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            生成计划
          </PrimaryButton>
        </>
      }
    >
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-950">生成新计划</DialogTitle>
            <DialogDescription className="text-slate-500">
              填写目标、截止时间和每日可投入时间。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <TextAreaField
              rows={4}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="如：两周复习完高数期末重点"
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <TextField type="number" min={5} value={daily} onChange={(e) => setDaily(Number(e.target.value))} />
            </div>
            <DialogFooter className="gap-3 pt-1 sm:space-x-0">
              <SecondaryButton type="button" onClick={() => setCreateOpen(false)}>取消</SecondaryButton>
              <PrimaryButton type="submit" disabled={createPlanMut.isPending}>
                <Plus size={16} />
                {createPlanMut.isPending ? "生成中..." : "生成计划"}
              </PrimaryButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PlanCommandPanel
        plans={weeklyQueuePlans}
        totalMinutes={totalMinutes}
        scheduledRate={scheduledRate}
        planCount={plans.length}
        nextDeadline={nextDeadline}
        weekDeadlineCount={weekDeadlineCount}
        unscheduledCount={unscheduledCount}
        onFocusPlan={focusPlanInList}
      />

      {schedule && <IntegratedSchedulePanel schedule={schedule} />}

      <div className="space-y-4">
          {pageErrorMessage && <ErrorState message={pageErrorMessage} />}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Surface key={index} className="h-28 animate-pulse bg-white" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <EmptyState
              title="暂无学习计划"
              description="创建第一个计划后，这里会展示目标、截止时间和每日投入。"
              icon={Route}
              action={<PrimaryButton onClick={() => setCreateOpen(true)}>创建第一个计划</PrimaryButton>}
            />
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
                            <div className="flex items-center gap-2">
                              <SecondaryButton
                                className="h-9 px-3 text-violet-600 hover:border-violet-200 hover:bg-violet-50"
                                onClick={() => handleGenerateTasks(plan.id)}
                                disabled={generatingPlanId === plan.id}
                              >
                                <Sparkles size={15} />
                                {generatingPlanId === plan.id ? "生成中…" : "生成任务"}
                              </SecondaryButton>
                              <SecondaryButton className="h-9 px-3 text-rose-600 hover:border-rose-200 hover:bg-rose-50" onClick={() => setDeletingPlan(plan)}>
                                <Trash2 size={15} />
                              </SecondaryButton>
                            </div>
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
                  tone="danger"
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

function IntegratedSchedulePanel({ schedule }: { schedule: any }) {
  const days = schedule?.days ?? [];
  const unscheduled = schedule?.unscheduled ?? [];
  const totalSlots = days.reduce((sum: number, day: any) => sum + (day.slots?.length ?? 0), 0);

  return (
    <Surface className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <IconBadge icon={Layers3} tone="blue" />
            <h2 className="text-sm font-semibold text-slate-950">多课程综合学习安排</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            根据课程作业截止、已有计划和待办任务自动排出未来 7 天学习时间块。
          </p>
        </div>
        <div className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
          共 {totalSlots} 个时间块
        </div>
      </div>

      {totalSlots === 0 ? (
        <div className="p-5">
          <EmptyState title="暂无可排程内容" description="创建学习计划、待办任务，或给课程作业资料设置截止日期后再生成。" icon={Layers3} />
        </div>
      ) : (
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {days.map((day: any) => (
            <div key={day.date} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{formatScheduleDate(day.date)}</div>
                  <div className="mt-0.5 text-xs text-slate-400">累计 {day.total_minutes} 分钟</div>
                </div>
                <CalendarClock size={17} className="text-slate-400" />
              </div>
              {day.slots?.length ? (
                <div className="space-y-2">
                  {day.slots.map((slot: any, index: number) => (
                    <div key={`${day.date}-${index}`} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{slot.title}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{slot.course_name}</span>
                            <span>{sourceTypeLabel(slot.source_type)}</span>
                            {slot.deadline && <span>截止 {formatDate(slot.deadline)}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                          {slot.start_time}-{slot.end_time}
                        </div>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-slate-400">{slot.reason}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-400">
                  当天暂无安排
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {unscheduled.length > 0 && (
        <div className="border-t border-slate-100 bg-amber-50/50 px-5 py-4">
          <div className="mb-2 text-sm font-semibold text-amber-700">未排入的任务</div>
          <div className="space-y-1 text-xs leading-5 text-amber-700">
            {unscheduled.slice(0, 5).map((item: any, index: number) => (
              <div key={index}>
                {item.course_name}：{item.title}（剩余 {item.estimated_minutes} 分钟）
              </div>
            ))}
          </div>
        </div>
      )}
    </Surface>
  );
}

function PlanCommandPanel({
  plans,
  totalMinutes,
  scheduledRate,
  planCount,
  nextDeadline,
  weekDeadlineCount,
  unscheduledCount,
  onFocusPlan,
}: {
  plans: any[];
  totalMinutes: number;
  scheduledRate: number;
  planCount: number;
  nextDeadline?: any;
  weekDeadlineCount: number;
  unscheduledCount: number;
  onFocusPlan: (plan: any) => void;
}) {
  const nextPlan = plans[0];
  const stackCards = useMemo(
    () =>
      plans.length
        ? plans.map((plan) => (
            <PlanStackCard
              key={plan.id}
              plan={plan}
              onFocus={() => onFocusPlan(plan)}
            />
          ))
        : [<PlanStackEmpty key="empty" />],
    [onFocusPlan, plans]
  );
  const scheduledCount = Math.max(0, planCount - unscheduledCount);
  const metrics = [
    {
      label: "已排期占比",
      value: `${scheduledRate}%`,
      hint: `${scheduledCount}/${planCount} 个计划已设置截止时间`,
      icon: null,
      tone: "slate" as const,
      progress: scheduledRate,
    },
    {
      label: "计划数量",
      value: planCount,
      hint: "当前正在追踪",
      icon: Route,
      tone: "blue" as const,
    },
    {
      label: "每日投入",
      value: `${totalMinutes} 分钟`,
      hint: "所有计划累计",
      icon: Clock3,
      tone: "emerald" as const,
    },
    {
      label: "最近截止",
      value: nextDeadline ? formatDate(nextDeadline.deadline) : "未设置",
      hint: `${weekDeadlineCount} 个 7 天内到期`,
      icon: CalendarClock,
      tone: "amber" as const,
    },
  ];

  return (
    <SpotlightCard
      radius={420}
      color="rgba(15,23,42,0.08)"
      className="overflow-hidden rounded-3xl border border-white/80 bg-white/82 shadow-[0_18px_54px_rgba(15,23,42,0.10)] backdrop-blur"
    >
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(15,23,42,0.06),transparent_28rem),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(248,250,252,0.42)_55%,rgba(226,232,240,0.36))]" />
      </div>
      <div className="relative grid gap-6 p-5 text-slate-950 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:p-6">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((item, index) => (
            <PlanMetricTile
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

        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="px-2 pb-2 pt-1">
            <div className="text-xs font-medium text-slate-400">计划队列</div>
            <div className="mt-1 text-sm font-semibold text-slate-950">
              {nextPlan ? "未来 7 天内优先查看的计划" : "本周暂无到期计划"}
            </div>
          </div>
          <div className="relative mt-2 h-64">
            <Stack
              cards={stackCards}
              sensitivity={90}
              sendToBackOnClick
              animationConfig={{ stiffness: 280, damping: 24 }}
              mobileClickOnly
            />
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}

function PlanMetricTile({
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
  icon: typeof Route | null;
  tone: "slate" | "blue" | "emerald" | "amber";
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
          <div className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
        </div>
        {Icon ? (
          <IconBadge icon={Icon} tone={tone} />
        ) : (
          <div className="shrink-0 rounded-full bg-white/95 p-1 shadow-sm">
            <ProgressRing value={progress ?? 0} className="size-12 text-xs" />
          </div>
        )}
      </div>
      <div className="mt-3 text-sm text-slate-500">{hint}</div>
    </motion.div>
  );
}

function PlanStackCard({ plan, onFocus }: { plan: any; onFocus: () => void }) {
  return (
    <div className="flex h-full w-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Route size={17} />
          </span>
          <DeadlineBadge deadline={plan.deadline} />
        </div>
        <div className="text-xs font-medium text-slate-400">学习目标</div>
        <h3 className="mt-1 line-clamp-3 text-base font-semibold leading-6 text-slate-950">{plan.goal}</h3>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <CalendarClock size={13} />
            截止
          </div>
          <div className="mt-1 truncate font-medium text-slate-800">{plan.deadline ? formatDate(plan.deadline) : "未设置"}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock3 size={13} />
            每日
          </div>
          <div className="mt-1 font-medium text-slate-800">{plan.daily_minutes} 分钟</div>
        </div>
      </div>
      <PrimaryButton
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onFocus();
        }}
        className="mt-3 h-9 px-3 text-xs"
      >
        定位列表
      </PrimaryButton>
    </div>
  );
}

function PlanStackEmpty() {
  return (
    <div className="flex h-full w-full flex-col justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Route size={20} />
      </div>
      <div className="mt-4 text-sm font-semibold text-slate-950">本周暂无到期计划</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">7 天内到期的计划会显示在这里。</p>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function formatScheduleDate(value: string) {
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("zh-CN", { weekday: "short", month: "2-digit", day: "2-digit" });
  } catch {
    return value;
  }
}

function sourceTypeLabel(value: string) {
  if (value === "assignment") return "课程作业";
  if (value === "task") return "待办任务";
  if (value === "plan") return "学习计划";
  return "学习安排";
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
