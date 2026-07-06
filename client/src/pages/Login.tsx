import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";

export default function Login() {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const r = await api.login(username, password);
      setToken(r.access_token);
      navigate("/courses", { replace: true });
    } catch (e: any) {
      setError(e.message || "登录失败");
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-100">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded shadow w-80 space-y-4">
        <h1 className="text-xl font-semibold">登录</h1>
        <input
          className="w-full border px-3 py-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
        />
        <input
          type="password"
          className="w-full border px-3 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="w-full bg-slate-900 text-white py-2 rounded hover:bg-slate-800">
          登录
        </button>
        <div className="text-xs text-slate-500">默认账号：demo / demo123</div>
      </form>
    </div>
  );
}