import Image from "next/image";

export default function UserCard() {
  const user = {
    name: "Alice",
    email: "alice@nexchat.local",
    image: "https://i.pravatar.cc/150?u=alice",
  };

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="app-panel hover-lift relative w-72 rounded-lg p-6 text-center">
        <div className="relative mx-auto h-24 w-24">
          <Image
            src={user.image}
            alt={user.name}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full border-4 border-white/20 object-cover"
          />
          <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#07111c] bg-cyan-300" />
        </div>

        <h2 className="mt-4 text-xl font-bold text-white">{user.name}</h2>
        <p className="text-sm text-slate-400">{user.email}</p>

        <button className="mt-4 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200">
          View Profile
        </button>
      </div>
    </div>
  );
}
