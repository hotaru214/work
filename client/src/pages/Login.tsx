import { FormEvent, useEffect, useRef, useState } from "react";
import { animate, stagger, splitText } from "animejs";
import { useNavigate } from "react-router-dom";
import SideRays from "../components/SideRays";
import { api, setToken } from "../api/client";

type Mode = "login" | "register";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={open ? "" : "opacity-60"}
    >
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </>
      )}
    </svg>
  );
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo123");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const headlineRef = useRef<HTMLDivElement>(null);
  const headlineTextRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!formRef.current || !headlineRef.current || !headlineTextRef.current) {
      return;
    }

    const splitter = splitText(headlineTextRef.current, {
      words: false,
      chars: true,
    });

    const headlineIntro = animate(splitter.chars, {
      y: [
        { to: "-2.75rem", ease: "outExpo", duration: 600 },
        { to: 0, ease: "outBounce", duration: 800, delay: 100 },
      ],
      rotate: {
        from: "-1turn",
        delay: 0,
      },
      delay: stagger(50),
      ease: "inOutCirc",
    });

    const formIntro = animate(formRef.current, {
      opacity: [0, 1],
      translateX: [56, 0],
      translateY: [18, 0],
      scale: [0.96, 1],
      duration: 780,
      delay: 260,
      ease: "outCubic",
    });

    return () => {
      headlineIntro.cancel();
      formIntro.cancel();
      splitter.revert();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await api.register(username, password);
      }
      const r = await api.login(username, password);
      setToken(r.access_token);
      navigate("/courses", { replace: true });
    } catch (e: any) {
      setError(e.message || (mode === "register" ? "注册失败" : "登录失败"));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-black px-4 py-10">
      <div className="absolute inset-0">
        <SideRays
          speed={1}
          intensity={2.3}
          spread={2.2}
          origin="top-left"
          saturation={1.2}
          blend={0.5}
          falloff={1.4}
          opacity={0.82}
        />
      </div>

      <main className="relative z-10 grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1fr_360px] lg:gap-20">
        <div ref={headlineRef} className="max-w-xl text-center text-white md:text-left">
          <h2 ref={headlineTextRef} className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            让学习更加简单
          </h2>
          <div className="mt-6 h-1 w-20 rounded-full bg-amber-300/90 mx-auto md:mx-0" />
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-80 justify-self-center space-y-4 rounded-lg border border-white/20 bg-white/90 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur md:justify-self-end">
          <h1 className="text-xl font-semibold">{mode === "login" ? "登录" : "注册"}</h1>

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm text-slate-700">用户名</label>
            <input
              id="username"
              className="w-full border px-3 py-2 rounded outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-slate-700">密码</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                className="w-full border px-3 py-2 pr-10 rounded outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                tabIndex={-1}
                aria-label={showPw ? "隐藏密码" : "显示密码"}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (mode === "login" ? "登录中…" : "注册中…") : (mode === "login" ? "登录" : "注册并登录")}
          </button>

          <div className="text-center text-sm text-slate-600">
            {mode === "login" ? "没有账号？" : "已有账号？"}
            <button type="button" onClick={switchMode} className="ml-1 text-slate-900 font-medium hover:underline">
              {mode === "login" ? "去注册" : "去登录"}
            </button>
          </div>

          {mode === "login" && (
            <div className="text-xs text-slate-500 text-center">默认账号：demo / demo123</div>
          )}
        </form>
      </main>
    </div>
  );
}
