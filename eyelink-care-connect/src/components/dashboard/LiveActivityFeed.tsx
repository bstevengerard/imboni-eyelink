import { Activity, CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import type { LiveEvent } from "@/lib/liveEvents";
import { cn } from "@/lib/utils";

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const tone = {
  info: "text-blue-600 bg-blue-100",
  success: "text-emerald-600 bg-emerald-100",
  warning: "text-amber-600 bg-amber-100",
  error: "text-red-600 bg-red-100",
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

interface Props {
  events: LiveEvent[];
  title?: string;
  emptyHint?: string;
  className?: string;
}

export default function LiveActivityFeed({ events, title = "Live activity", emptyHint = "Waiting for live events…", className }: Props) {
  const visible = events.slice(0, 6);
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">Realtime, rate-limited</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{emptyHint}</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((e) => {
            const Icon = iconMap[e.level];
            return (
              <li key={e.id} className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tone[e.level])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  {e.body && <p className="text-xs text-muted-foreground truncate">{e.body}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(e.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
