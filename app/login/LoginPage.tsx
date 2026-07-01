"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { rotateQuizPageToken } from "@/lib/quiz-client";
import { touchKeyboardNumericProps, touchKeyboardProps } from "@/lib/touch-keyboard";
import { checkBiometricStatus } from "@/lib/biometric-client";
import BiometricLoginPanel, { BiometricRegistrationPanel } from "@/components/login/BiometricLoginPanel";

type LoginMode = "biometric" | "prontuario" | "register-biometric";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "";

  const [mode, setMode] = useState<LoginMode>("biometric");
  const [prontuario, setProntuario] = useState("");
  const [password, setPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [pendingAdminPassword, setPendingAdminPassword] = useState<string | undefined>();
  const [pendingRole, setPendingRole] = useState<string>("EMPLOYEE");
  const [demoProfile, setDemoProfile] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigateAfterLogin = useCallback(
    (role: string) => {
      rotateQuizPageToken();
      if (redirect && redirect.startsWith("/")) {
        router.push(redirect);
      } else if (role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/app");
      }
      router.refresh();
    },
    [redirect, router]
  );

  const handleLoginSuccess = useCallback(
    (payload: { role: string }) => {
      setError(null);
      navigateAfterLogin(payload.role);
    },
    [navigateAfterLogin]
  );

  async function handleProntuarioSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const statusRes = await checkBiometricStatus(prontuario.trim());
      const statusData = await statusRes.json();

      if (!statusRes.ok) {
        setError(statusData.error || "Prontuário não encontrado.");
        return;
      }

      if (statusData.requiresBiometricRegistration) {
        if (statusData.requiresPassword && !requiresPassword) {
          setRequiresPassword(true);
          setError("Informe a senha de administrador para continuar.");
          return;
        }

        if (statusData.requiresPassword && requiresPassword && !password) {
          setError("Senha é obrigatória para administradores.");
          return;
        }

        setPendingRole(statusData.role);
        setPendingAdminPassword(statusData.requiresPassword ? password : undefined);
        setMode("register-biometric");
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prontuario: prontuario.trim(),
          password: requiresPassword ? password : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true);
        }
        if (data.requiresBiometricRegistration) {
          setPendingRole(data.role ?? "EMPLOYEE");
          setMode("register-biometric");
          return;
        }
        setError(data.error || "Erro ao entrar.");
        return;
      }

      handleLoginSuccess({ role: data.role });
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
            {mode === "biometric"
              ? "Posicione sua digital no leitor para acessar o portal."
              : mode === "register-biometric"
                ? "Complete o cadastro da sua digital para vincular ao prontuário."
                : "Informe seu prontuário. Administradores sem biometria também devem informar a senha."}
          </p>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
          )}

          {mode === "biometric" && (
            <>
              <BiometricLoginPanel
                demoProfile={demoProfile}
                onSuccess={(payload) => handleLoginSuccess({ role: payload.role })}
                onError={setError}
              />

              <div className="mt-4 space-y-2">
                <label className="block text-xs text-slate-500">
                  Perfil demo (somente sem leitor)
                  <select
                    value={demoProfile}
                    onChange={(e) => setDemoProfile(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((profile) => (
                      <option key={profile} value={profile}>
                        Perfil {profile}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMode("prontuario");
                    setError(null);
                  }}
                  className="w-full py-2 text-sm text-slate-600 hover:text-slate-800 underline-offset-2 hover:underline"
                >
                  Primeiro acesso / entrar com prontuário
                </button>
              </div>
            </>
          )}

          {mode === "prontuario" && (
            <form onSubmit={handleProntuarioSubmit} className="space-y-4">
              <div>
                <label htmlFor="prontuario" className="block text-sm font-medium text-slate-700 mb-1">
                  Prontuário
                </label>
                <input
                  id="prontuario"
                  type="text"
                  value={prontuario}
                  onChange={(e) => {
                    setProntuario(e.target.value);
                    if (requiresPassword) {
                      setRequiresPassword(false);
                      setPassword("");
                    }
                  }}
                  required
                  autoComplete="username"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Ex: 289426"
                  {...touchKeyboardNumericProps()}
                />
              </div>

              {requiresPassword && (
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
                    autoFocus
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="••••••"
                    {...touchKeyboardProps()}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Conta de administrador sem biometria — senha obrigatória.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-60 transition-colors"
              >
                {loading ? "Verificando..." : requiresPassword ? "Continuar" : "Continuar com prontuário"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("biometric");
                  setError(null);
                }}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Voltar para login com digital
              </button>
            </form>
          )}

          {mode === "register-biometric" && (
            <>
              <div className="mb-4">
                <label className="block text-xs text-slate-500">
                  Perfil demo (somente sem leitor)
                  <select
                    value={demoProfile}
                    onChange={(e) => setDemoProfile(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((profile) => (
                      <option key={profile} value={profile}>
                        Perfil {profile}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <BiometricRegistrationPanel
                prontuario={prontuario.trim()}
                password={pendingAdminPassword}
                isAdmin={pendingRole === "ADMIN"}
                demoProfile={demoProfile}
                onSuccess={(payload) => handleLoginSuccess({ role: payload.role })}
                onError={setError}
                onCancel={() => {
                  setMode("prontuario");
                  setError(null);
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
