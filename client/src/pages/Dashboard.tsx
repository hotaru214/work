import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface DashboardData {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  course_count: number;
  material_count: number;
  plan_count: number;
  today_tasks: any[];
  upcoming_tasks: any[];
  active_plans: any[];
  recent_sessions: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setData(await api.getDashboard());
    })();
  }, []);

  async function toggleTask(id: number, done: boolean) {
    await api.toggleTask(id, done);
    setData(await api.getDashboard());
  }

  if (!data) return null;

  const rate = data.total_tasks > 0
    ? Math.round((data.completed_tasks / data.total_tasks) * 100)
    : 0;

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">学习仪表盘</h1>
        <p className="text-slate-500 text-sm mt-1">{today}</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="课程" value={data.course_count} color="blue" />
        <StatCard label="学习资料" value={data.material_count} color="green" />
        <StatCard
          label="任务完成率"
          value={`${rate}%`}
          color="purple"
          sub={`${data.completed_tasks}/${data.total_tasks}`}
        />
        <StatCard label="学习计划" value={data.plan_count} color="orange" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 左列 */}
        <div className="space-y-6">
          {/* 今日任务 */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-3 text-slate-800">
              今日待办 ({data.today_tasks.length})
            </h2>
            {data.today_tasks.length === 0 ? (
              <p className="text-slate-400 text-sm">暂无今日任务</p>
            ) : (
              <ul className="divide-y">
                {data.today_tasks.map((t: any) => (
                  <li key={t.id} className="py-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => toggleTask(t.id, e.target.checked)}
                    />
                    <span className="text-sm">{t.title}</span>
                    {t.due_date && (
                      <span className="ml-auto text-xs text-red-500">
                        {new Date(t.due_date).toLocaleDateString("zh-CN")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 即将到期任务 */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-3 text-slate-800">
              即将到期 ({data.upcoming_tasks.length})
            </h2>
            {data.upcoming_tasks.length === 0 ? (
              <p className="text-slate-400 text-sm">未来7天内无到期任务</p>
            ) : (
              <ul className="divide-y">
                {data.upcoming_tasks.map((t: any) => (
                  <li key={t.id} className="py-2 flex items-center gap-3">
                    <span className="text-sm">{t.title}</span>
                    {t.due_date && (
                      <span className="ml-auto text-xs text-orange-500">
                        {new Date(t.due_date).toLocaleDateString("zh-CN")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 右列 */}
        <div className="space-y-6">
          {/* 最近对话 */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-3 text-slate-800">最近对话</h2>
            {data.recent_sessions.length === 0 ? (
              <p className="text-slate-400 text-sm">暂无对话记录</p>
            ) : (
              <ul className="divide-y">
                {data.recent_sessions.map((s: any) => (
                  <li key={s.id}>
                    <button
                      className="w-full text-left py-2 text-sm text-blue-600 hover:underline"
                      onClick={() => navigate(`/chat/${s.id}`)}
                    >
                      {s.title}
                      <span className="float-right text-xs text-slate-400">
                        {new Date(s.created_at).toLocaleDateString("zh-CN")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 活跃计划 */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-3 text-slate-800">
              学习计划 ({data.active_plans.length})
            </h2>
            {data.active_plans.length === 0 ? (
              <p className="text-slate-400 text-sm">
                暂无计划，
                <Link to="/plan" className="text-blue-600 hover:underline">
                  去创建
                </Link>
              </p>
            ) : (
              <ul className="divide-y">
                {data.active_plans.map((p: any) => (
                  <li key={p.id} className="py-2">
                    <p className="text-sm font-medium">{p.goal}</p>
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>每日 {p.daily_minutes} 分钟</span>
                      {p.deadline && (
                        <span>
                          截止: {new Date(p.deadline).toLocaleDateString("zh-CN")}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: "blue" | "green" | "purple" | "orange";
  sub?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className={`rounded shadow p-4 ${colors[color]}`}>
      <div className="text-sm opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}
