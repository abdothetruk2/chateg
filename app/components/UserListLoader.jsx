import { Loader2 } from "lucide-react";

export default function UserListLoader({
  count = 5,
  label = "Loading users",
  avatar = "rounded-[1.35rem]",
}) {
  return (
    <div className="space-y-3" aria-label={label} aria-live="polite">
      <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        <Loader2 className="sidebar-load-ring h-3.5 w-3.5 text-cyan-200" />
        {label}
      </div>

      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="app-list-item app-loading-card flex items-center gap-3 rounded-[1.5rem] p-3"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className={`skeleton-shimmer h-14 w-14 shrink-0 bg-white/10 ${avatar}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton-shimmer h-3 w-2/3 rounded bg-white/10" />
            <div className="skeleton-shimmer h-3 w-1/2 rounded bg-white/10" />
          </div>
          <div className="skeleton-shimmer h-6 w-6 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}
