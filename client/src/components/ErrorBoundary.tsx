import { Component, type ReactNode } from "react";
import { useRouteError } from "react-router-dom";
import { reportError } from "../utils/error-reporting";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** 模块级标识，便于错误信息定位 */
  label?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    if (typeof window !== "undefined" && (window as any).__errs__) {
      (window as any).__errs__.push({ error, info });
    }
    reportError(error, this.props.label || "ErrorBoundary", info);
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return <DefaultFallback error={this.state.error} reset={this.reset} label={this.props.label} />;
    }
    return this.props.children;
  }
}

export function DefaultFallback({
  error,
  reset,
  label,
}: {
  error: Error;
  reset: () => void;
  label?: string;
}) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-3xl">😵</div>
      <div className="text-lg font-semibold">{label ? `${label}出错` : "页面出错了"}</div>
      <div className="max-w-md text-sm text-slate-500">
        {error?.message || "未知错误，请稍后重试"}
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
        >
          重试
        </button>
        <button
          onClick={() => window.history.back()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          返回上一页
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          回到首页
        </button>
      </div>
    </div>
  );
}

/** 路由级 ErrorBoundary：给 react-router-dom 的 errorElement 用 */
export function RouteErrorBoundary() {
  const err = useRouteError() as Error | undefined;
  return (
    <DefaultFallback error={err ?? new Error("未知错误")} reset={() => window.location.reload()} label="路由" />
  );
}
