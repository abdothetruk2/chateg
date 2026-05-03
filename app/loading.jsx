export default function Loading() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center text-white">
      <div className="app-scale-in app-premium-card app-loading-card flex flex-col items-center gap-5 rounded-[1.75rem] px-8 py-7">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-2xl border border-cyan-300/20 bg-cyan-300/10" />
          <div className="absolute inset-1 sidebar-load-ring rounded-2xl border-2 border-transparent border-t-cyan-300" />
          <div className="absolute inset-4 rounded-xl bg-cyan-300/25 blur-sm" />
          <div className="absolute inset-0 grid place-items-center text-sm font-black text-cyan-100">
            Eg
          </div>
        </div>
        <div className="text-center">
          <p className="font-black text-white">Loading Egchat</p>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Preparing your workspace...
          </p>
        </div>
      </div>
    </div>
  );
}
