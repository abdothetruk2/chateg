import Sidebar from "../components/Sidebar";
import SettingsBar from "../components/SettingsBar";

export default function SettingsLayout({ children }) {
  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white lg:grid-cols-[4.5rem_minmax(17rem,21rem)_1fr] lg:pb-0">
      <Sidebar />
      <SettingsBar />
      <main className="thin-scrollbar min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
