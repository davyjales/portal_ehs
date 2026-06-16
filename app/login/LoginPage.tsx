"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "";

  const [prontuario, setProntuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prontuario, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao entrar.");
        return;
      }

      if (redirect && redirect.startsWith("/")) {
        router.push(redirect);
      } else if (data.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/app");
      }
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8 border border-white/60">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-block">
            ← Voltar ao informativo
          </Link>

          <h1 className="text-2xl font-bold text-slate-800 mb-1">Entrar</h1>
          <p className="text-slate-500 text-sm mb-6">
            Use seu prontuário e senha para acessar a área do funcionário.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="prontuario" className="block text-sm font-medium text-slate-700 mb-1">
                Prontuário
              </label>
              <input
                id="prontuario"
                type="text"
                value={prontuario}
                onChange={(e) => setProntuario(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Ex: 12345"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="••••••"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-60 transition-colors"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400 text-center italic">
            Biometria em breve — protótipo usa senha
          </p>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
            <p className="font-medium mb-1">Contas de teste:</p>
            <p>Funcionário: 12345 / 123456</p>
            <p>Admin: admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
