import { Loader2 } from "lucide-react";
import UserListLoader from "./UserListLoader";

export default function AsidePageLoader({
  label = "Loading workspace",
  rows = 5,
  showStories = true,
}) {
  return (
    <aside className="app-panel flex min-h-[46vh] flex-col border-b p-5 text-white md:h-screen md:border-b-0">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            <Loader2 className="sidebar-load-ring h-3.5 w-3.5" />
            {label}
          </div>
          <div className="skeleton-shimmer h-8 w-40 rounded-xl bg-white/10" />
          <div className="skeleton-shimmer h-3 w-56 max-w-full rounded bg-white/10" />
        </div>
        <div className="skeleton-shimmer h-11 w-11 rounded-2xl bg-white/10" />
      </div>

      <div className="skeleton-shimmer mb-5 h-12 rounded-2xl bg-white/10" />

      {showStories && (
        <div className="mb-5 flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="skeleton-shimmer h-14 w-14 shrink-0 rounded-[1.35rem] bg-white/10"
            />
          ))}
        </div>
      )}

      <UserListLoader count={rows} label="Loading people" />
    </aside>
  );
}
