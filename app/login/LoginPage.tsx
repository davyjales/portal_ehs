"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { rotateQuizPageToken } from "@/lib/quiz-client";
import { TouchKeyboardActivator } from "@/components/layout/TouchKeyboardActivator";
import { touchKeyboardNumericProps, touchKeyboardProps } from "@/lib/touch-keyboard";
import { checkBiometricStatus } from "@/lib/biometric-client";
import BiometricLoginPanel, {
  BiometricConfirmPanel,
  BiometricRegistrationPanel,
} from "@/components/login/BiometricLoginPanel";

type LoginMode = "prontuario" | "register-biometric" | "confirm-biometric" | "biometric";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "";

  const [mode, setMode] = useState<LoginMode>("prontuario");
  const [prontuario, setProntuario] = useState("");
  const [password, setPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [pendingAdminPassword, setPendingAdminPassword] = useState<string | undefined>();
  const [pendingRole, setPendingRole] = useState<string>("EMPLOYEE");
  const [pendingUserId, setPendingUserId] = useState<string>("");
  const [pendingUserName, setPendingUserName] = useState<string>("");
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

      // Admin: prontuário + senha apenas (sem digital).
      if (statusData.role === "ADMIN" || statusData.requiresPassword) {
        if (!requiresPassword) {
          setRequiresPassword(true);
          setError("Informe a senha de administrador.");
          return;
        }

        if (!password) {
          setError("Senha é obrigatória para administradores.");
          return;
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prontuario: prontuario.trim(),
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.requiresPassword) {
            setRequiresPassword(true);
          }
          setError(data.error || "Erro ao entrar.");
          return;
        }

        handleLoginSuccess({ role: data.role });
        return;
      }

      if (statusData.requiresBiometricRegistration) {
        setPendingRole(statusData.role);
        setPendingAdminPassword(undefined);
        setMode("register-biometric");
        return;
      }

      // Colaborador com biometria: confirmar digital.
      setPendingUserId(statusData.userId);
      setPendingUserName(statusData.name ?? "");
      setPendingRole(statusData.role ?? "EMPLOYEE");
      setMode("confirm-biometric");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <TouchKeyboardActivator />
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8 border border-white/60">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-block">
            ← Voltar ao informativo
          </Link>

          <h1 className="text-2xl font-bold text-slate-800 mb-1">Entrar</h1>
          <p className="text-slate-500 text-sm mb-6">
            {mode === "register-biometric"
              ? "Cadastre sua digital para vincular ao prontuário."
              : mode === "confirm-biometric"
                ? "Confirme sua digital para acessar o portal."
                : mode === "biometric"
                  ? "Posicione sua digital no leitor para acessar o portal."
                  : "Colaboradores: prontuário e digital. Administradores: prontuário e senha."}
          </p>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
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
                    Conta de administrador — entre com prontuário e senha.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-60 transition-colors"
              >
                {loading ? "Verificando..." : "Continuar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("biometric");
                  setError(null);
                }}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Colaborador? Entrar com digital
              </button>
            </form>
          )}

          {mode === "register-biometric" && (
            <BiometricRegistrationPanel
              prontuario={prontuario.trim()}
              password={pendingAdminPassword}
              isAdmin={pendingRole === "ADMIN"}
              onSuccess={(payload) => handleLoginSuccess({ role: payload.role })}
              onError={setError}
              onCancel={() => {
                setMode("prontuario");
                setError(null);
              }}
            />
          )}

          {mode === "confirm-biometric" && pendingUserId && (
            <BiometricConfirmPanel
              prontuario={prontuario.trim()}
              userId={pendingUserId}
              userName={pendingUserName}
              onSuccess={(payload) => handleLoginSuccess({ role: payload.role })}
              onError={setError}
              onCancel={() => {
                setMode("prontuario");
                setError(null);
              }}
            />
          )}

          {mode === "biometric" && (
            <>
              <BiometricLoginPanel
                onSuccess={(payload) => handleLoginSuccess({ role: payload.role })}
                onError={setError}
              />

              <button
                type="button"
                onClick={() => {
                  setMode("prontuario");
                  setError(null);
                }}
                className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Voltar para login com prontuário
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
