import { FormEvent, useEffect, useRef, useState } from "react";
import { animate, stagger, splitText } from "animejs";
import { cubicBezier } from "animejs/easings";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import BorderGlow from "../components/BorderGlow";
import GlareHover from "../components/GlareHover";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
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

function getPasswordStrengthMessage(password: string): string {
  if (!password) return "密码至少 8 位，建议包含大小写字母、数字和符号";
  const value = password.trim();
  const classes = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;
  if (value.length < 8) return "密码至少需要 8 位";
  if (classes < 3) return "请至少包含大小写字母、数字、符号中的 3 类";
  if (["12345678", "password", "password1", "qwerty123", "admin123", "demo123"].includes(value.toLowerCase())) {
    return "这个密码太常见，请换一个更安全的密码";
  }
  return "";
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo123");
  const [confirm, setConfirm] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const headlineRef = useRef<HTMLDivElement>(null);
  const headlineTextRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const formContentRef = useRef<HTMLDivElement>(null);
  const authAnimationRef = useRef<{ cancel: () => void } | null>(null);
  const heightAnimationRef = useRef<{ cancel: () => void } | null>(null);
  const previousFormHeightRef = useRef<number | null>(null);
  const switchingRef = useRef(false);
  const switchDirectionRef = useRef(1);
  const [isSwitching, setIsSwitching] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const passwordStrengthMessage = mode === "register" ? getPasswordStrengthMessage(password) : "";

  useEffect(() => {
    if (!cardRef.current || !headlineRef.current || !headlineTextRef.current) {
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

    const formIntro = animate(cardRef.current, {
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
      authAnimationRef.current?.cancel();
      heightAnimationRef.current?.cancel();
      splitter.revert();
    };
  }, []);

  useEffect(() => {
    if (!switchingRef.current || !formContentRef.current) {
      return;
    }

    const direction = switchDirectionRef.current;
    const items = Array.from(
      formContentRef.current.querySelectorAll<HTMLElement>("[data-auth-animate]")
    );

    const previousHeight = previousFormHeightRef.current;
    const nextHeight = formContentRef.current.scrollHeight;
    if (previousHeight && Math.abs(nextHeight - previousHeight) > 1) {
      heightAnimationRef.current?.cancel();
      formContentRef.current.style.height = `${previousHeight}px`;
      formContentRef.current.style.overflow = "hidden";
      void formContentRef.current.offsetHeight;
      heightAnimationRef.current = animate(formContentRef.current, {
        height: [`${previousHeight}px`, `${nextHeight}px`],
        duration: 620,
        ease: cubicBezier(0.16, 1, 0.3, 1),
        onComplete: () => {
          if (!formContentRef.current) {
            return;
          }
          formContentRef.current.style.height = "";
          formContentRef.current.style.overflow = "";
          heightAnimationRef.current = null;
        },
      });
    }
    previousFormHeightRef.current = null;

    authAnimationRef.current?.cancel();
    authAnimationRef.current = animate(items, {
      opacity: [0, 1],
      translateX: [18 * direction, 0],
      translateY: [8, 0],
      scale: [0.985, 1],
      filter: ["blur(5px)", "blur(0px)"],
      delay: stagger(46),
      duration: 440,
      ease: "outCubic",
      onComplete: () => {
        switchingRef.current = false;
        setIsSwitching(false);
        authAnimationRef.current = null;
      },
    });
  }, [mode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (!/^[A-Za-z0-9_-]{3,32}$/.test(username.trim())) {
          setError("用户名需为 3-32 位字母、数字、下划线或短横线");
          setLoading(false);
          return;
        }
        if (passwordStrengthMessage) {
          setError(passwordStrengthMessage);
          setLoading(false);
          return;
        }
        if (password !== confirm) {
          setError("两次输入的密码不一致");
          setLoading(false);
          return;
        }
        let avatarUrl: string | null = null;
        if (avatarFile) {
          const upload = await api.uploadRegisterAvatar(avatarFile);
          avatarUrl = upload.avatar_url;
        }
        await api.register(username.trim().toLowerCase(), password, username.trim(), avatarUrl);
      }
      const r = await api.login(username.trim().toLowerCase(), password);
      setToken(r.access_token);
      // 清除所有缓存查询，确保新用户数据被重新获取
      queryClient.clear();
      navigate("/courses", { replace: true });
    } catch (e: any) {
      setError(e.message || (mode === "register" ? "注册失败" : "登录失败"));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setError("");
    if (loading || switchingRef.current) {
      return;
    }

    const nextMode = mode === "login" ? "register" : "login";
    const direction = nextMode === "register" ? 1 : -1;
    if (formContentRef.current) {
      previousFormHeightRef.current = formContentRef.current.scrollHeight;
    }
    const items = Array.from(
      formContentRef.current?.querySelectorAll<HTMLElement>("[data-auth-animate]") ?? []
    );

    switchDirectionRef.current = direction;
    switchingRef.current = true;
    setIsSwitching(true);
    setConfirm("");
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }

    authAnimationRef.current?.cancel();
    heightAnimationRef.current?.cancel();

    if (!items.length) {
      setMode(nextMode);
      return;
    }

    authAnimationRef.current = animate(items, {
      opacity: [1, 0],
      translateX: [0, -18 * direction],
      translateY: [0, -4],
      scale: [1, 0.985],
      filter: ["blur(0px)", "blur(5px)"],
      delay: stagger(22),
      duration: 180,
      ease: "inCubic",
      onComplete: () => {
        setMode(nextMode);
      },
    });
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

      <main className="relative z-10 grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1fr_380px] lg:gap-20">
        <div ref={headlineRef} className="max-w-xl text-center text-white md:text-left">
          <h2 ref={headlineTextRef} className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            让学习更加简单
          </h2>
          <div className="mt-6 h-1 w-20 rounded-full bg-amber-300/90 mx-auto md:mx-0" />
        </div>

        <div ref={cardRef} className="w-full max-w-[380px] justify-self-center md:justify-self-end">
          <BorderGlow
            className="w-full shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            backgroundColor="#120f17"
            borderRadius={23}
            glowRadius={52}
            glowIntensity={1.5}
            edgeSensitivity={30}
            coneSpread={25}
            fillOpacity={0.5}
            colors={["#c084fc", "#f472b6", "#38bdf8"]}
            animated
          >
            <form onSubmit={onSubmit} className="p-8 text-slate-100">
              <div ref={formContentRef} className="space-y-5">
                <div data-auth-animate className="space-y-1">
                  <h1 className="text-2xl font-semibold">{mode === "login" ? "登录" : "注册"}</h1>
                  <p className="text-sm text-slate-400">
                    {mode === "login" ? "继续进入你的学习空间" : "创建账号，开始你的学习计划"}
                  </p>
                </div>

                <div data-auth-animate className="space-y-2">
                  {mode === "register" && (
                    <GlareHover
                      width="100%"
                      height="80px"
                      background="rgba(255,255,255,0.04)"
                      borderRadius="12px"
                      borderColor="rgba(255,255,255,0.1)"
                      glareColor="#ffffff"
                      glareOpacity={0.22}
                      glareAngle={-35}
                      glareSize={180}
                      transitionDuration={700}
                      className="mb-4"
                    >
                      <div className="relative z-10 flex w-full items-center gap-4 p-3">
                        <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-violet-100 text-lg font-semibold text-violet-500 ring-1 ring-white/10 transition hover:bg-violet-200">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="头像预览" className="h-full w-full object-cover" />
                          ) : (
                            "学"
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setAvatarFile(file);
                              if (avatarPreview) {
                                URL.revokeObjectURL(avatarPreview);
                              }
                              setAvatarPreview(file ? URL.createObjectURL(file) : null);
                            }}
                          />
                        </label>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-200">上传头像</div>
                        </div>
                      </div>
                    </GlareHover>
                  )}
                  <label htmlFor="username" className="text-sm text-slate-300">用户名</label>
                  <input
                    id="username"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-amber-200/70 focus:ring-2 focus:ring-amber-200/20"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名（不可重复）"
                    autoComplete="username"
                    minLength={3}
                    maxLength={32}
                  />
                  {mode === "register" && (
                    <p className="text-xs text-slate-500">3-32 位字母、数字、下划线或短横线</p>
                  )}
                </div>

                <div data-auth-animate className="space-y-2">
                  <label htmlFor="password" className="text-sm text-slate-300">密码</label>
                  <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 pr-10 text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-amber-200/70 focus:ring-2 focus:ring-amber-200/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-white"
                    tabIndex={-1}
                    aria-label={showPw ? "隐藏密码" : "显示密码"}
                  >
                    <EyeIcon open={showPw} />
                  </button>
                  </div>
                  {mode === "register" && passwordStrengthMessage && (
                    <p className="text-xs text-amber-100/80">{passwordStrengthMessage}</p>
                  )}
                </div>

                {mode === "register" && (
                  <div data-auth-animate className="space-y-2">
                    <label htmlFor="confirm" className="text-sm text-slate-300">确认密码</label>
                    <div className="relative">
                      <input
                        id="confirm"
                        type={showPw ? "text" : "password"}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 pr-10 text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-amber-200/70 focus:ring-2 focus:ring-amber-200/20"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="请再次输入密码"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-white"
                        tabIndex={-1}
                        aria-label={showPw ? "隐藏密码" : "显示密码"}
                      >
                        <EyeIcon open={showPw} />
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div data-auth-animate className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <InteractiveHoverButton
                  data-auth-animate
                  type="submit"
                  disabled={loading || isSwitching}
                  className="w-full justify-center rounded-lg border-slate-200 py-2.5 text-sm font-medium text-slate-950 hover:text-white"
                >
                  {loading ? (mode === "login" ? "登录中…" : "注册中…") : (mode === "login" ? "登录" : "注册并登录")}
                </InteractiveHoverButton>

                <div data-auth-animate className="text-center text-sm text-slate-400">
                  {mode === "login" ? "没有账号？" : "已有账号？"}
                  <button
                    type="button"
                    onClick={switchMode}
                    disabled={loading || isSwitching}
                    className="ml-1 font-medium text-amber-100 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mode === "login" ? "去注册" : "去登录"}
                  </button>
                </div>

                <div data-auth-animate className="text-center text-xs text-slate-500">
                  {mode === "login" ? "默认账号：demo / demo123" : "注册成功后将自动登录"}
                </div>
              </div>
            </form>
          </BorderGlow>
        </div>
      </main>
    </div>
  );
}
