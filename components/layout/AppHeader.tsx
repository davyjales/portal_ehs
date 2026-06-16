"use client";

import { useRouter } from "next/navigation";

export type TabId =
  | "inicio"
  | "pendencias"
  | "alertas"
  | "certificados"
  | "solicitacoes"
  | "oneup";

const TABS: { id: TabId; label: string }[] = [
  { id: "inicio", label: "Início" },
  { id: "pendencias", label: "Pendências" },
  { id: "alertas", label: "Alertas" },
  { id: "certificados", label: "Certificados" },
  { id: "solicitacoes", label: "Solicitações" },
  { id: "oneup", label: "1UP" },
];

export function AppHeader({
  userName,
  activeTab,
  onTabChange,
}: {
  userName: string;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-wide">Portal EHS</p>
          <p className="text-lg sm:text-xl font-semibold text-slate-800">Olá, {userName}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 text-base px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors font-medium"
        >
          Sair
        </button>
      </div>

      <nav className="flex w-full border-t border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 min-w-0 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors text-center ${
              activeTab === tab.id
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

export { TABS };
