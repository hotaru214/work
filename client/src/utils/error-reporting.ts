type ErrorEventPayload = {
  message: string;
  stack?: string;
  route: string;
  source: string;
  time: string;
  extra?: unknown;
};

const BUFFER_KEY = "__app_error_events__";
const MAX_BUFFER_SIZE = 30;

function getBuffer(): ErrorEventPayload[] {
  if (typeof window === "undefined") return [];
  return ((window as any)[BUFFER_KEY] ||= []);
}

export function reportError(error: unknown, source = "app", extra?: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  const payload: ErrorEventPayload = {
    message: err.message,
    stack: err.stack,
    route: typeof window !== "undefined" ? window.location.pathname : "",
    source,
    time: new Date().toISOString(),
    extra: sanitizeExtra(extra),
  };
  const buffer = getBuffer();
  buffer.push(payload);
  if (buffer.length > MAX_BUFFER_SIZE) buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
  console.error("[client-error]", payload);
}

export function installGlobalErrorReporting() {
  if (typeof window === "undefined" || (window as any).__client_error_reporting_installed__) return;
  (window as any).__client_error_reporting_installed__ = true;
  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, "window.error", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, "unhandledrejection");
  });
}

export function getReportedErrors() {
  return getBuffer();
}

function sanitizeExtra(extra: unknown) {
  if (extra == null) return undefined;
  try {
    return JSON.parse(JSON.stringify(extra));
  } catch {
    return String(extra);
  }
}
