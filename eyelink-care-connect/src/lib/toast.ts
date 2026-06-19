import { toast as sonnerToast } from "sonner";

export type BackendToastType = "success" | "error" | "warning" | "info";

export type BackendToastLike = {
  type?: BackendToastType | string;
  title?: string;
  message?: string;
  detail?: string;
  error?: string;
};

function normalizeType(type?: BackendToastType | string): BackendToastType {
  const t = (type ?? "info").toLowerCase();
  if (t === "success" || t === "error" || t === "warning" || t === "info") return t;
  return "info";
}

function normalizeMessage(t: BackendToastLike) {
  return (
    t.message || t.detail || t.error || t.title || (typeof t === "string" ? t : "")
  );
}

/**
 * Call this whenever the backend returns `{ success: boolean, message?: string, error?: string, type?: ... }`.
 */
export function showBackendToast(payload: BackendToastLike & { success?: boolean }) {
  const type =
    (payload.type as any) ??
    (typeof payload.success === "boolean" ? (payload.success ? "success" : "error") : undefined);

  const normalizedType = normalizeType(type);
  const message = normalizeMessage(payload);

  if (!message) return;

  const opts = {
    duration: 3500,
  };

  switch (normalizedType) {
    case "success":
      sonnerToast.success(message, opts);
      return;
    case "error":
      sonnerToast.error(message, opts);
      return;
    case "warning":
      sonnerToast.warning(message, opts);
      return;
    default:
      sonnerToast(message, opts);
  }
}

