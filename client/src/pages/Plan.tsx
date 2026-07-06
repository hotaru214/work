import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

export default function Plan() {
  const [plans, setPlans] = useState<any[]>([]);
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [daily, setDaily] = useState(60);

  async function load() { setPlans(await api.listPlans()); }
  useEffect(() => { load(); }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await api.createPlan({
      goal,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      daily_minutes: Number(daily),
    });
    setGoal(""); setDeadline(""); setDaily(60);
    load();
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">学习计划</h1>
      <form onSubmit={onCreate} className="bg-white p-4 rounded shadow mb-6 space-y-3">
        <div>
          <label className="text-sm">学习目标</label>
          <input className="w-full border px-3 py-2 rounded mt-1" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="如：两周复习完高数期末" required />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm">截止时间</label>
            <input type="datetime-local" className="w-full border px-3 py-2 rounded mt-1" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-sm">每日可用分钟</label>
            <input type="number" className="w-full border px-3 py-2 rounded mt-1" value={daily} onChange={(e) => setDaily(Number(e.target.value))} />
          </div>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800">生成计划</button>
      </form>

      {plans.length === 0 ? (
        <div className="text-slate-500">暂无计划</div>
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.id} className="bg-white p-4 rounded shadow flex justify-between items-start">
              <div>
                <div className="font-medium">{p.goal}</div>
                <div className="text-xs text-slate-500 mt-1">
                  截止 {p.deadline ? new Date(p.deadline).toLocaleString() : "—"} · 每日 {p.daily_minutes} 分钟
                </div>
              </div>
              <button className="text-sm text-red-600 hover:underline" onClick={async () => { await api.deletePlan(p.id); load(); }}>
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}