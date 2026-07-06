import { useEffect, useState } from "react";
import { api, getYuqueToken, setYuqueToken, getTriliumUrl, setTriliumUrl, getTriliumToken, setTriliumToken } from "../api/client";

export default function Profile() {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [courses, setCourses] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [yuqueToken, setLocalYuqueToken] = useState(getYuqueToken() || "");
  const [yuqueUser, setYuqueUser] = useState<any>(null);
  const [yuqueVerifying, setYuqueVerifying] = useState(false);
  const [yuqueError, setYuqueError] = useState("");
  const [triliumUrl, setLocalTriliumUrl] = useState(getTriliumUrl() || "http://localhost:8080");
  const [triliumToken, setLocalTriliumToken] = useState(getTriliumToken() || "");
  const [triliumConnected, setTriliumConnected] = useState(!!getTriliumUrl() && !!getTriliumToken());
  const [triliumInfo, setTriliumInfo] = useState<any>(null);
  const [triliumConnecting, setTriliumConnecting] = useState(false);
  const [triliumError, setTriliumError] = useState("");

    useEffect(() => {
    if (getTriliumUrl() && getTriliumToken()) {
      api.trilium.verify()
        .then((r: any) => { setTriliumInfo(r); setTriliumConnected(true); })
        .catch(() => { setTriliumConnected(false); setTriliumToken(""); setTriliumUrl(""); });
    }
  }, []);

  useEffect(() => {
    (async () => {
      setMe(await api.me());
      setCourses((await api.listCourses()).length);
      setTasks(await api.listTasks());
    })();
  }, []);

  // Check if already connected
  useEffect(() => {
    if (getYuqueToken()) {
      api.yuque.verify()
        .then((r: any) => setYuqueUser(r.user))
        .catch(() => { setYuqueToken(""); setYuqueUser(null); });
    }
  }, []);

  async function toggle(id: number, done: boolean) {
    await api.toggleTask(id, done);
    setTasks(await api.listTasks());
  }

  async function handleConnect() {
    if (!yuqueToken.trim()) return;
    setYuqueVerifying(true);
    setYuqueError("");
    try {
      const r: any = await api.yuque.verify();
      setYuqueUser(r.user);
      setYuqueToken(yuqueToken.trim());
    } catch (e: any) {
      setYuqueError("连接失败，请检查 Token 是否正确");
      setYuqueUser(null);
    } finally {
      setYuqueVerifying(false);
    }
  }

  async function handleTriliumConnect() {
    if (!triliumUrl.trim() || !triliumToken.trim()) return;
    setTriliumConnecting(true);
    setTriliumError("");
    setTriliumUrl(triliumUrl.trim());
    setTriliumToken(triliumToken.trim());
    try {
      const r: any = await api.trilium.verify();
      setTriliumInfo(r);
      setTriliumConnected(true);
    } catch (e: any) {
      setTriliumError("连接失败，请检查地址和 Token 是否正确");
      setTriliumConnected(false);
    } finally {
      setTriliumConnecting(false);
    }
  }

  function handleTriliumDisconnect() {
    setTriliumUrl("");
    setLocalTriliumUrl("http://localhost:8080");
    setTriliumToken("");
    setLocalTriliumToken("");
    setTriliumConnected(false);
    setTriliumInfo(null);
  }

  function handleDisconnect() {
    setYuqueToken("");
    setLocalYuqueToken("");
    setYuqueUser(null);
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">个人中心</h1>

      {/* 用户信息 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="text-sm text-slate-500">用户名</div>
        <div className="text-lg font-semibold text-slate-800">{me?.username ?? "—"}</div>
        <div className="text-sm text-slate-500 mt-3">课程数</div>
        <div className="text-lg font-semibold text-slate-800">{courses}</div>
      </div>

      {/* 语雀连接 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📕</span>
          <h2 className="text-lg font-semibold text-slate-800">连接语雀</h2>
        </div>

        {yuqueUser ? (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-lg">
                {yuqueUser.avatar_url ? (
                  <img src={yuqueUser.avatar_url} className="w-10 h-10 rounded-full" alt="" />
                ) : "👤"}
              </div>
              <div>
                <div className="font-medium text-slate-800">{yuqueUser.name}</div>
                <div className="text-xs text-slate-500">{yuqueUser.login}</div>
              </div>
              <div className="ml-auto">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">已连接</span>
              </div>
            </div>
            <button onClick={handleDisconnect} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              断开连接
            </button>
          </div>
        ) : (
          <div>
            <div className="text-sm text-slate-600 mb-3">
              连接语雀后，可以在本应用中浏览和管理你的语雀知识库。
            </div>
            <div className="text-xs text-slate-400 mb-3">
              请前往
              <a href="https://www.yuque.com/settings/tokens" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline mx-1">语雀 Token 设置页面</a>
              创建个人访问令牌，粘贴到下方：
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                placeholder="输入语雀个人访问令牌 (Token)"
                value={yuqueToken}
                onChange={(e) => setLocalYuqueToken(e.target.value)}
              />
              <button
                onClick={handleConnect}
                disabled={yuqueVerifying || !yuqueToken.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
              >
                {yuqueVerifying ? "验证中..." : "连接"}
              </button>
            </div>
            {yuqueError && <div className="text-sm text-red-500 mt-2">{yuqueError}</div>}
          </div>
        )}
      </div>


      {/* Trilium 连接 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🌲</span>
          <h2 className="text-lg font-semibold text-slate-800">连接 Trilium Notes</h2>
        </div>

        {triliumConnected ? (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-lg">🌲</div>
              <div>
                <div className="font-medium text-slate-800">{triliumInfo?.app_name || "Trilium"}</div>
                <div className="text-xs text-slate-500">v{triliumInfo?.version || ""} (build {triliumInfo?.build || ""})</div>
              </div>
              <div className="ml-auto">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">已连接</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-3">URL: {triliumUrl || "-"}</div>
            <button onClick={handleTriliumDisconnect} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              断开连接
            </button>
          </div>
        ) : (
          <div>
            <div className="text-sm text-slate-600 mb-3">
              连接 Trilium Notes 后，可以在本应用中浏览和管理你的 Trilium 笔记。
            </div>
            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trilium 地址</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                  placeholder="http://localhost:8080"
                  value={triliumUrl}
                  onChange={(e) => setLocalTriliumUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">API Token</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                  placeholder="输入 Trilium API Token"
                  value={triliumToken}
                  onChange={(e) => setLocalTriliumToken(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleTriliumConnect} disabled={triliumConnecting || !triliumUrl.trim() || !triliumToken.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
                {triliumConnecting ? "连接中..." : "连接"}
              </button>
            </div>
            {triliumError && <div className="text-sm text-red-500 mt-2">{triliumError}</div>}
          </div>
        )}
      </div>
      {/* 待办任务 */}
      <h2 className="text-lg font-semibold text-slate-800 mb-3">待办任务</h2>
      {tasks.length === 0 ? (
        <div className="text-slate-400 text-sm">暂无任务</div>
      ) : (
        <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {tasks.map((t) => (
            <li key={t.id} className="px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => toggle(t.id, e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-blue-600"
              />
              <span className={`text-sm ${t.done ? "line-through text-slate-400" : "text-slate-700"}`}>{t.title}</span>
              <span className="ml-auto text-xs text-slate-400">
                {t.due_date ? new Date(t.due_date).toLocaleDateString() : ""}
              </span>
              <button
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
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
