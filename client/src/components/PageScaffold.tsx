import { Children, isValidElement } from "react";
import type { ComponentType, HTMLAttributes, ReactNode, SVGProps } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../lib/utils";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: string | number; strokeWidth?: string | number }>;

export function PageShell({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("app-surface-bg min-h-full px-4 py-5 text-slate-950 sm:px-6 sm:py-6", className)}
      initial={reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <motion.header
          className="group glass-card relative overflow-hidden rounded-2xl px-6 py-5"
          whileHover={reduceMotion ? undefined : { y: -1 }}
          transition={{ duration: 0.2 }}
        >
          {/* 左侧品牌渐变竖条 */}
          <span className="pointer-events-none absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-brand opacity-80" />
          {/* 顶部渐变高光线 */}
          <motion.span
            className="pointer-events-none absolute inset-x-0 top-0 h-px origin-center bg-gradient-to-r from-transparent via-slate-500/55 to-transparent"
            initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
            animate={reduceMotion ? undefined : { scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* 右上角柔光晕 */}
          <span className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-gradient-brand opacity-[0.07] blur-2xl" />
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.56)_42%,transparent_74%)] opacity-0 transition duration-500 group-hover:opacity-100" />
          <div className="relative flex flex-wrap items-end justify-between gap-4 pl-2">
            <div className="min-w-0">
              {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</div>}
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
              {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
            </div>
            {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
          </div>
        </motion.header>
        <motion.div
          className="flex flex-col gap-6"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function Surface({
  children,
  className,
  ...props
}: {
  children?: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("surface-card rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_28px_rgba(15,23,42,0.05)] backdrop-blur", className)} {...props}>
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/60 px-5 py-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <span className="h-3.5 w-1 rounded-full bg-gradient-brand" />
          {title}
        </h2>
        {description && <p className="mt-1 pl-3 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type BadgeTone = "slate" | "blue" | "violet" | "emerald" | "amber" | "rose" | "brand";

export function IconBadge({
  icon: Icon,
  tone = "slate",
}: {
  icon: IconType;
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    slate: "bg-slate-100 text-slate-700 shadow-slate-200/60",
    blue: "bg-blue-50 text-blue-600 shadow-blue-200/60",
    violet: "bg-violet-50 text-violet-600 shadow-violet-200/60",
    emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-200/60",
    amber: "bg-amber-50 text-amber-600 shadow-amber-200/60",
    rose: "bg-rose-50 text-rose-600 shadow-rose-200/60",
    brand: "bg-gradient-brand text-white shadow-[0_8px_20px_rgba(15,23,42,0.24)] ring-white/40",
  };

  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/80 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md", tones[tone])}>
      <Icon size={18} strokeWidth={2.1} />
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
  progress,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: IconType;
  tone?: BadgeTone;
  progress?: number;
}) {
  const barTones: Record<BadgeTone, string> = {
    slate: "bg-slate-900",
    blue: "bg-blue-600",
    violet: "bg-violet-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    brand: "bg-gradient-brand",
  };

  return (
    <Surface className="relative overflow-hidden p-4">
      <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">{value}</div>
        </div>
        <IconBadge icon={icon} tone={tone} />
      </div>
      {hint && <div className="relative mt-2 text-xs text-slate-500">{hint}</div>}
      {typeof progress === "number" && (
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out", barTones[tone])}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </Surface>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: IconType;
}) {
  return (
    <div className="group flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/90 px-6 py-12 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow-md">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:-translate-y-0.5 group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-sm">
        <Icon size={22} />
      </span>
      <div className="mt-4 text-sm font-semibold text-slate-900">{title}</div>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle size={16} />
        加载失败
      </div>
      <div className="mt-1 text-rose-600">{message}</div>
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  tone = "brand",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "brand" | "danger" }) {
  const { hoverIcon, iconOnly, label } = splitButtonContent(children);
  const iconOnlyToneClass =
    tone === "danger"
      ? "border-rose-200 bg-white text-rose-600 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-rose-300"
      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:ring-slate-300";
  const toneClass =
    iconOnly
      ? iconOnlyToneClass
      : tone === "danger"
        ? "border-rose-500 bg-white text-rose-600 shadow-sm hover:border-rose-500 hover:text-white hover:shadow-[0_10px_28px_rgba(225,29,72,0.26)] focus-visible:ring-rose-300"
        : "border-slate-950 bg-white text-slate-950 shadow-sm hover:border-slate-950 hover:text-white hover:shadow-[0_10px_28px_rgba(15,23,42,0.24)] focus-visible:ring-slate-300";
  const fillClass = tone === "danger" ? "bg-rose-500" : "bg-slate-950";
  return (
    <button
      className={cn(
        "group/btn relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg border px-4 text-sm font-medium transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        toneClass,
        className
      )}
      {...props}
    >
      {iconOnly ? (
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      ) : (
        <>
          <span className={cn("relative z-10 h-2 w-2 shrink-0 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:scale-[120] group-focus-visible/btn:scale-[120]", fillClass)} />
          <span className="relative z-10 inline-flex items-center gap-2 transition-all duration-300 group-hover/btn:translate-x-12 group-hover/btn:opacity-0">
            {label}
          </span>
          <span className="absolute inset-0 z-20 flex translate-x-10 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover/btn:translate-x-0 group-hover/btn:opacity-100">
            <span>{label}</span>
            {hoverIcon}
          </span>
        </>
      )}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { hoverIcon, iconOnly, label } = splitButtonContent(children);
  const classNameText = className || "";
  const fillClass = classNameText.includes("rose") || classNameText.includes("red")
    ? "bg-rose-500"
    : classNameText.includes("violet")
      ? "bg-violet-500"
      : classNameText.includes("blue")
        ? "bg-blue-500"
        : classNameText.includes("emerald") || classNameText.includes("green")
          ? "bg-emerald-500"
          : "bg-slate-950";
  return (
    <button
      className={cn(
        iconOnly
          ? "relative inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          : "group/btn relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:text-white hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        className
      )}
      {...props}
    >
      {iconOnly ? (
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      ) : (
        <>
          <span className={cn("relative z-10 h-2 w-2 shrink-0 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:scale-[120] group-focus-visible/btn:scale-[120]", fillClass)} />
          <span className="relative z-10 inline-flex items-center gap-2 transition-all duration-300 group-hover/btn:translate-x-12 group-hover/btn:opacity-0">
            {label}
          </span>
          <span className="absolute inset-0 z-20 flex translate-x-10 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover/btn:translate-x-0 group-hover/btn:opacity-100">
            <span>{label}</span>
            {hoverIcon}
          </span>
        </>
      )}
    </button>
  );
}

function splitButtonContent(children: ReactNode) {
  const parts = Children.toArray(children).filter((part) => !(typeof part === "string" && part.trim() === ""));
  const hasLeadingIcon = parts.length > 1 && isValidElement(parts[0]);

  return {
    hoverIcon: hasLeadingIcon ? parts[0] : null,
    iconOnly: parts.length === 1 && isValidElement(parts[0]),
    label: hasLeadingIcon ? parts.slice(1) : parts,
  };
}

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-200 bg-white/95 px-3 text-sm text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:bg-white focus:shadow-md focus:ring-2 focus:ring-slate-200",
        props.className
      )}
    />
  );
}

export function TextAreaField(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:bg-white focus:shadow-md focus:ring-2 focus:ring-slate-200",
        props.className
      )}
    />
  );
}
