import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Clock3, Plus, Route, Trash2, X } from "lucide-react";
import { api } from "../api/client";
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
  const [plans, setPlans] = useState<any[]>([]);
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [daily, setDaily] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingPlan, setDeletingPlan] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setPlans(await api.listPlans());
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createPlan({
        goal,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        daily_minutes: Number(daily),
      });
      setGoal("");
      setDeadline("");
      setDaily(60);
      await load();
    } catch (err: any) {
      setError(err.message || "创建失败");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(id: number) {
    setError("");
    try {
      await api.deletePlan(id);
      setDeletingPlan(null);
      await load();
    } catch (err: any) {
      setError(err.message || "删除失败");
    }
  }

  const totalMinutes = plans.reduce((sum, item) => sum + Number(item.daily_minutes || 0), 0);
  const nextDeadline = plans
    .filter((item) => item.deadline)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];

  return (
    <PageShell
      title="学习计划"
      description="为阶段目标设置截止时间和每日投入，后续任务可以围绕计划拆解。"
      actions={<div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">共 {plans.length} 个计划</div>}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="计划数量" value={plans.length} hint="当前正在追踪" icon={Route} tone="blue" />
        <MetricCard label="每日投入" value={`${totalMinutes} 分钟`} hint="所有计划累计" icon={Clock3} tone="emerald" />
        <MetricCard label="最近截止" value={nextDeadline ? formatDate(nextDeadline.deadline) : "未设置"} hint={nextDeadline?.goal || "暂无截止时间"} icon={CalendarClock} tone="amber" />
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
            <PrimaryButton type="submit" disabled={saving} className="w-full">
              <Plus size={16} />
              {saving ? "生成中..." : "生成计划"}
            </PrimaryButton>
          </form>
        </Surface>

        <div className="space-y-4">
          {error && <ErrorState message={error} />}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Surface key={index} className="h-28 animate-pulse bg-white" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <EmptyState title="暂无学习计划" description="创建第一个计划后，这里会展示目标、截止时间和每日投入。" icon={Route} />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AnimatePresence initial={false}>
              {plans.map((plan, index) => (
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
                <PrimaryButton type="button" className="bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-300" onClick={() => deletePlan(deletingPlan.id)}>
                  <Trash2 size={16} />
                  删除
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
