import AsidePageLoader from "../components/AsidePageLoader";

export default function ChatLoading() {
  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 md:grid-cols-[minmax(19rem,22rem)_1fr] lg:grid-cols-[4.5rem_minmax(18rem,22rem)_1fr] lg:pb-0">
      <div className="app-panel hidden border-r border-white/10 lg:block" />
      <AsidePageLoader label="Loading messages" rows={5} />
      <main className="hidden h-screen flex-col border-l border-white/10 p-6 md:flex">
        <div className="skeleton-shimmer mb-4 h-16 rounded-[1.5rem] bg-white/10" />
        <div className="flex-1 space-y-4 py-6">
          <div className="skeleton-shimmer h-12 w-2/5 rounded-2xl bg-white/10" />
          <div className="skeleton-shimmer ml-auto h-12 w-1/2 rounded-2xl bg-cyan-300/20" />
          <div className="skeleton-shimmer h-24 w-3/5 rounded-2xl bg-white/10" />
        </div>
        <div className="skeleton-shimmer h-16 rounded-[1.5rem] bg-white/10" />
      </main>
    </div>
  );
}
