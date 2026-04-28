export default function Loading() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border border-cyan-300/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-300" />
          <div className="absolute inset-3 rounded-full bg-cyan-300/20 blur-sm" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Loading Nexchat...</p>
      </div>
    </div>
  );
}
