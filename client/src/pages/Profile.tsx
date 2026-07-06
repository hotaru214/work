import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Profile() {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [courses, setCourses] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setMe(await api.me());
      setCourses((await api.listCourses()).length);
      setTasks(await api.listTasks());
    })();
  }, []);

  async function toggle(id: number, done: boolean) {
    await api.toggleTask(id, done);
    setTasks(await api.listTasks());
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">个人中心</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="text-slate-700">用户名：<b>{me?.username ?? "—"}</b></div>
        <div className="text-slate-700 mt-1">课程数：{courses}</div>
      </div>

      <h2 className="text-xl font-semibold mb-3">待办任务</h2>
      {tasks.length === 0 ? (
        <div className="text-slate-500">暂无任务</div>
      ) : (
        <ul className="bg-white rounded shadow divide-y">
          {tasks.map((t) => (
            <li key={t.id} className="px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => toggle(t.id, e.target.checked)}
              />
              <span className={t.done ? "line-through text-slate-400" : ""}>{t.title}</span>
              <span className="ml-auto text-xs text-slate-500">
                {t.due_date ? new Date(t.due_date).toLocaleDateString() : ""}
              </span>
              <button
                className="text-red-600 text-sm hover:underline"
                onClick={async () => { await api.deleteTask(t.id); setTasks(await api.listTasks()); }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}