export default function DownloadSection() {
  return (
    <div className="relative z-10 flex w-full flex-col items-center px-6 py-10 text-center">
      <div className="relative mb-12 size-64 animate-float md:size-80">
        <div className="absolute inset-0 rounded-[40px] bg-cyan-300/10 blur-2xl animate-pulse"></div>

        <div className="absolute inset-0 flex scale-95 rotate-6 items-center justify-center rounded-lg border border-white/5 bg-white/[0.08] opacity-50 shadow-2xl"></div>

        <div className="absolute inset-0 flex scale-95 -rotate-3 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] opacity-50 shadow-2xl"></div>

        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#07111c] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex h-10 items-center gap-2 border-b border-white/5 bg-white/[0.07] px-4">
            <div className="size-2.5 rounded-full bg-red-500/30"></div>
            <div className="size-2.5 rounded-full bg-yellow-500/30"></div>
            <div className="size-2.5 rounded-full bg-green-500/30"></div>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-6">
            <div className="h-3 w-1/3 rounded-full bg-white/5"></div>
            <div className="self-end h-10 w-3/4 rounded-lg rounded-tr-sm border border-cyan-300/20 bg-cyan-300/10"></div>
            <div className="h-10 w-2/3 rounded-lg rounded-tl-sm border border-white/5 bg-white/5"></div>
            <div className="self-end h-10 w-1/2 rounded-lg rounded-tr-sm border border-cyan-300/20 bg-cyan-300/10"></div>
          </div>
        </div>

        <div className="absolute -right-6 -bottom-6 flex size-20 rotate-12 items-center justify-center rounded-lg bg-cyan-300 shadow-[0_10px_30px_rgba(34,211,238,0.24)]">
          <span className="material-symbols-outlined fill text-[40px] text-slate-950">
            forum
          </span>
        </div>
      </div>

      <h2 className="mb-6 text-4xl font-black tracking-tight text-white md:text-5xl">
        Download <span className="italic text-cyan-200">EgChat</span> Desktop
      </h2>

      <p className="mb-10 max-w-2xl text-xl leading-relaxed text-slate-300">
        Experience seamless messaging with our native desktop app. Stay
        connected across all your devices with end-to-end encryption.
      </p>

      <div className="mb-12 flex flex-col items-center gap-4 md:flex-row">
        <button className="flex h-14 items-center gap-3 rounded-lg bg-cyan-300 px-10 font-black text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-cyan-200">
          <span className="material-symbols-outlined fill">download</span>
          Download for Windows
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-slate-300">
          <span className="material-symbols-outlined text-[20px] text-cyan-200">
            verified_user
          </span>
          <span className="font-bold">Beta v1.0.0</span>
        </div>
      </div>
    </div>
  )
}
