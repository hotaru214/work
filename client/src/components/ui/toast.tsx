import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "loading" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind | "undo";
  message: string;
  undo?: () => void;
  undoLabel?: string;
  duration: number;
}

interface ToastApi {
  success: (msg: string, duration?: number) => void;
  error: (msg: string, duration?: number) => void;
  info: (msg: string, duration?: number) => void;
  loading: (msg: string) => number;
  dismiss: (id: number) => void;
  update: (id: number, kind: ToastKind, msg: string, duration?: number) => void;
  undo: (msg: string, onUndo: () => void, undoLabel?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((item: Omit<ToastItem, "id">) => {
    const id = nextId.current++;
    setItems((list) => [...list, { ...item, id }]);
    if (item.duration > 0 && item.kind !== "loading") {
      setTimeout(() => dismiss(id), item.duration);
    }
    return id;
  }, [dismiss]);

  const api: ToastApi = {
    success: (m, d = 2400) => push({ kind: "success", message: m, duration: d }),
    error: (m, d = 4000) => push({ kind: "error", message: m, duration: d }),
    info: (m, d = 2400) => push({ kind: "info", message: m, duration: d }),
    loading: (m) => push({ kind: "loading", message: m, duration: 0 }),
    dismiss,
    update: (id, kind, m, d) => {
      setItems((list) => list.map((t) => (t.id === id ? { ...t, kind, message: m, duration: d ?? t.duration } : t)));
      if (d && d > 0) setTimeout(() => dismiss(id), d);
    },
    undo: (m, onUndo, undoLabel = "撤销", d = 5000) => push({ kind: "undo", message: m, undo: onUndo, undoLabel, duration: d }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[10000] flex flex-col gap-2">
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const kindCls: Record<string, string> = {
    success: "border-emerald-500/30 bg-emerald-50 text-emerald-800",
    error: "border-red-500/30 bg-red-50 text-red-800",
    info: "border-slate-300 bg-white text-slate-800",
    loading: "border-slate-300 bg-white text-slate-700",
    undo: "border-amber-400/40 bg-amber-50 text-amber-900",
  };
  const icon: Record<string, ReactNode> = {
    success: <span>✓</span>,
    error: <span>✕</span>,
    info: <span>i</span>,
    loading: <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />,
    undo: <span>↶</span>,
  };
  return (
    <div className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-md ${kindCls[item.kind]}`}>
      <span className="font-mono">{icon[item.kind]}</span>
      <span className="whitespace-pre-wrap">{item.message}</span>
      {item.kind === "undo" && (
        <button
          onClick={() => {
            item.undo?.();
            onDismiss();
          }}
          className="ml-1 text-xs font-semibold underline disabled:opacity-50"
        >
          {item.undoLabel}
        </button>
      )}
      <button onClick={onDismiss} aria-label="关闭" className="ml-1 text-xs opacity-50 hover:opacity-100">×</button>
    </div>
  );
}

export function useApiToast() {
  const t = useToast();
  return t;
}

// Helper to run mutation-style with toast
export function useMutationToast() {
  const t = useToast();
  const idRef = useRef<number | null>(null);
  return {
    start: (msg: string) => { idRef.current = t.loading(msg); },
    success: (msg: string) => {
      if (idRef.current !== null) t.update(idRef.current, "success", msg, 2400);
      else t.success(msg);
      idRef.current = null;
    },
    error: (msg: string) => {
      if (idRef.current !== null) t.update(idRef.current, "error", msg, 4000);
      else t.error(msg);
      idRef.current = null;
    },
  };
}