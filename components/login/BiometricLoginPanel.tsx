"use client";

import { useCallback, useEffect, useState } from "react";
import {
  checkBridge,
  fetchPortalTemplates,
  identifyUser,
  loginWithBiometric,
  scanSingle,
  verifyLive,
  type BridgeHealth,
} from "@/lib/biometric-client";

type BiometricLoginPanelProps = {
  onSuccess: (payload: { role: string; name: string }) => void;
  onError: (message: string) => void;
};

export default function BiometricLoginPanel({
  onSuccess,
  onError,
}: BiometricLoginPanelProps) {
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Verificando leitor...");

  useEffect(() => {
    checkBridge().then((health) => {
      setBridgeHealth(health);
      if (!health) {
        setStatusMessage("Serviço de biometria offline.");
        return;
      }
      setStatusMessage(
        health.deviceConnected
          ? "Leitor conectado. Clique abaixo e coloque o dedo uma vez no sensor."
          : "Leitor não detectado. Verifique USB e drivers."
      );
    });
  }, []);

  const handleBiometricLogin = useCallback(async () => {
    if (!bridgeHealth) {
      onError("Serviço de biometria offline. Inicie o Futronic Bridge ou use login por prontuário.");
      return;
    }

    setLoading(true);
    setStatusMessage("Aguardando digital… coloque o dedo uma vez.");

    try {
      const templates = await fetchPortalTemplates();
      if (templates.length === 0) {
        onError("Nenhuma biometria cadastrada. Entre com seu prontuário para cadastrar.");
        return;
      }

      let userId: string | undefined;

      // 1 cadastro: mesmo caminho do prontuário+digital (FTRVerify) — evita identify 1:N quebrado.
      if (templates.length === 1) {
        const verify = await verifyLive(templates[0].templateBase64, 60000);
        if (!verify.success || verify.verified !== true) {
          onError(verify.message || "Digital não reconhecida.");
          return;
        }
        userId = templates[0].userId;
      } else {
        // Vários cadastros: 1 toque no bridge + comparação ENROLL compatível.
        const identify = await identifyUser(templates);
        if (!identify.success || !identify.matched || !identify.userId) {
          onError(identify.message || "Digital não reconhecida.");
          return;
        }
        userId = identify.userId;
      }

      const loginRes = await loginWithBiometric(userId);
      const data = await loginRes.json();
      if (!loginRes.ok) {
        onError(data.error || "Erro ao entrar com biometria.");
        return;
      }

      onSuccess({ role: data.role, name: data.name });
    } catch {
      onError("Falha na comunicação com o leitor biométrico.");
    } finally {
      setLoading(false);
      setStatusMessage("Leitor conectado. Clique abaixo e coloque o dedo uma vez no sensor.");
    }
  }, [bridgeHealth, onError, onSuccess]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl">
          👆
        </div>
        <p className="text-sm text-slate-600">{statusMessage}</p>
      </div>

      <button
        type="button"
        onClick={handleBiometricLogin}
        disabled={loading || !bridgeHealth}
        className="w-full py-3 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors"
      >
        {loading ? "Lendo digital..." : "Entrar com digital"}
      </button>
    </div>
  );
}

type BiometricConfirmPanelProps = {
  prontuario: string;
  userId: string;
  userName?: string;
  onSuccess: (payload: { role: string; name: string }) => void;
  onError: (message: string) => void;
  onCancel: () => void;
};

/** Prontuário já conhecido + digital cadastrada: confirma com 1 toque (FTRVerify). */
export function BiometricConfirmPanel({
  prontuario,
  userId,
  userName,
  onSuccess,
  onError,
  onCancel,
}: BiometricConfirmPanelProps) {
  const [bridgeReady, setBridgeReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Verificando leitor...");

  useEffect(() => {
    checkBridge().then((health) => {
      if (!health?.deviceConnected) {
        setBridgeReady(false);
        setMessage(
          health
            ? "Leitor não detectado. Verifique USB e drivers."
            : "Serviço de biometria offline. Inicie o Futronic Bridge no PC."
        );
        return;
      }
      setBridgeReady(true);
      setMessage("Coloque o dedo uma vez no sensor para confirmar o acesso.");
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!bridgeReady) {
      onError("Leitor biométrico indisponível.");
      return;
    }

    setLoading(true);
    setMessage("Aguardando digital… coloque o dedo uma vez.");
    try {
      const templates = await fetchPortalTemplates();
      const mine = templates.find((t) => t.userId === userId);
      if (!mine?.templateBase64) {
        onError("Biometria deste prontuário não encontrada. Cadastre novamente ou entre só com a digital.");
        return;
      }

      const verify = await verifyLive(mine.templateBase64, 60000);
      if (!verify.success || verify.verified !== true) {
        onError(verify.message || "Digital não confere. Tente novamente.");
        return;
      }

      const loginRes = await loginWithBiometric(userId);
      const data = await loginRes.json();
      if (!loginRes.ok) {
        onError(data.error || "Erro ao entrar com biometria.");
        return;
      }

      onSuccess({ role: data.role, name: data.name });
    } catch {
      onError("Falha na comunicação com o leitor biométrico.");
    } finally {
      setLoading(false);
      setMessage("Coloque o dedo uma vez no sensor para confirmar o acesso.");
    }
  }, [bridgeReady, onError, onSuccess, userId]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <h2 className="font-semibold text-slate-800">Confirmar digital</h2>
        <p className="text-sm text-slate-600 mt-1">
          Prontuário <span className="font-mono">{prontuario}</span>
          {userName ? ` · ${userName}` : ""}
        </p>
        <p className="text-sm text-slate-600 mt-2">{message}</p>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading || bridgeReady === false}
        className="w-full py-3 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors"
      >
        {loading ? "Aguardando digital..." : "Confirmar com digital"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
      >
        Voltar
      </button>
    </div>
  );
}

type BiometricRegistrationPanelProps = {
  prontuario: string;
  password?: string;
  isAdmin: boolean;
  onSuccess: (payload: { role: string; name: string }) => void;
  onError: (message: string) => void;
  onCancel: () => void;
};

export function BiometricRegistrationPanel({
  prontuario,
  password,
  isAdmin,
  onSuccess,
  onError,
  onCancel,
}: BiometricRegistrationPanelProps) {
  const [step, setStep] = useState<"first" | "confirm">("first");
  const [firstTemplate, setFirstTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bridgeReady, setBridgeReady] = useState<boolean | null>(null);
  const [message, setMessage] = useState(
    "Clique abaixo. Use SEMPRE o mesmo dedo em todas as amostras (não troque de dedo)."
  );

  useEffect(() => {
    checkBridge().then((health) => {
      if (!health) {
        setBridgeReady(false);
        setMessage("Serviço de biometria offline. Inicie o Futronic Bridge no PC.");
        return;
      }
      if (!health.deviceConnected) {
        setBridgeReady(false);
        setMessage("Leitor não detectado. Verifique USB e drivers.");
        return;
      }
      setBridgeReady(true);
      setMessage("Clique abaixo. Use SEMPRE o mesmo dedo em todas as amostras (não troque de dedo).");
    });
  }, []);

  async function captureTemplate(mode: "enroll" | "verify") {
    const scan = await scanSingle({ timeoutMs: 90000, mode });
    if (!scan.success || !scan.templateBase64) {
      throw new Error(scan.message || "Não foi possível capturar a digital.");
    }
    return scan.templateBase64;
  }

  async function handleFirstScan() {
    if (!bridgeReady) {
      onError("Leitor biométrico indisponível. Verifique o serviço Futronic Bridge.");
      return;
    }

    setLoading(true);
    setMessage("Cadastro: mesmo dedo, coloque e tire várias vezes até o LED parar.");
    try {
      const template = await captureTemplate("enroll");
      setFirstTemplate(template);
      setStep("confirm");
      setMessage("Confirmação: coloque o MESMO dedo uma vez.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erro na captura.");
      setMessage("Clique abaixo. Use SEMPRE o mesmo dedo em todas as amostras (não troque de dedo).");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmScan() {
    if (!firstTemplate) return;

    setLoading(true);
    setMessage("Confirmação: coloque o MESMO dedo uma vez no sensor.");
    try {
      // 1 toque ao vivo (FTRVerify) — não usa FTREnroll com PURPOSE_VERIFY (código 3).
      const verify = await verifyLive(firstTemplate, 60000);
      if (!verify.success || verify.verified !== true) {
        onError(verify.message || "As digitais não coincidem. Tente novamente.");
        setStep("first");
        setFirstTemplate(null);
        setMessage("Clique abaixo. Use SEMPRE o mesmo dedo em todas as amostras (não troque de dedo).");
        return;
      }

      const { registerBiometric } = await import("@/lib/biometric-client");
      const res = await registerBiometric({
        prontuario,
        password: isAdmin ? password : undefined,
        templateBase64: firstTemplate,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresPassword) {
          onError("Senha de administrador necessária para cadastrar biometria.");
        } else {
          onError(data.error || "Erro ao cadastrar biometria.");
        }
        return;
      }

      onSuccess({ role: data.role, name: data.name });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erro na confirmação.");
      setMessage("Confirmação: coloque o mesmo dedo uma vez no sensor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
        <h2 className="font-semibold text-emerald-900">Cadastrar biometria</h2>
        <p className="text-sm text-emerald-800 mt-1">
          Prontuário <span className="font-mono">{prontuario}</span> — {message}
        </p>
        <p className="text-xs text-emerald-700 mt-2">
          Etapa {step === "first" ? "1" : "2"} de 2
          {step === "first" ? " · ~3 amostras" : " · 1 toque"}
        </p>
      </div>

      <button
        type="button"
        onClick={step === "first" ? handleFirstScan : handleConfirmScan}
        disabled={loading || bridgeReady === false}
        className="w-full py-3 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors"
      >
        {loading
          ? "Aguardando digital..."
          : step === "first"
            ? "Capturar digital"
            : "Confirmar digital"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
      >
        Voltar
      </button>
    </div>
  );
}
