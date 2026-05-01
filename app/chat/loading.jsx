export default function ChatLoading() {
  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 md:grid-cols-[minmax(19rem,22rem)_1fr] lg:grid-cols-[4.5rem_minmax(18rem,22rem)_1fr] lg:pb-0">
      <div className="hidden border-r border-white/10 bg-[#07111f]/90 lg:block" />
      <aside className="app-panel flex min-h-[46vh] flex-col border-b p-4 md:h-screen md:border-b-0">
        <div className="mb-5 h-8 w-36 animate-pulse rounded bg-white/10" />
        <div className="mb-5 h-11 animate-pulse rounded-lg bg-white/10" />
        <div className="mb-5 flex gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-14 w-14 animate-pulse rounded-full bg-white/10" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
              <div className="h-14 w-14 animate-pulse rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="hidden h-screen flex-col border-l border-white/10 p-6 md:flex">
        <div className="mb-4 h-14 animate-pulse rounded-lg bg-white/10" />
        <div className="flex-1 space-y-4 py-6">
          <div className="h-12 w-2/5 animate-pulse rounded-lg bg-white/10" />
          <div className="ml-auto h-12 w-1/2 animate-pulse rounded-lg bg-cyan-300/20" />
          <div className="h-24 w-3/5 animate-pulse rounded-lg bg-white/10" />
        </div>
        <div className="h-14 animate-pulse rounded-lg bg-white/10" />
      </main>
    </div>
  );
}
