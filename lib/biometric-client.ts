const DEFAULT_BRIDGE_URL = "http://127.0.0.1:8080";

export type BridgeHealth = {
  ok: boolean;
  demoMode: boolean;
  deviceConnected: boolean;
};

export type ScanResponse = {
  success: boolean;
  templateBase64?: string;
  imageBase64?: string;
  message?: string;
};

export type IdentifyResponse = {
  success: boolean;
  matched: boolean;
  userId?: string;
  score?: number;
  message?: string;
};

export type VerifyResponse = {
  success: boolean;
  verified: boolean;
  score?: number;
  message?: string;
};

export type BiometricTemplateEntry = {
  userId: string;
  templateBase64: string;
};

function bridgeUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_BIOMETRIC_BRIDGE_URL || DEFAULT_BRIDGE_URL;
  }
  return process.env.BIOMETRIC_BRIDGE_URL || DEFAULT_BRIDGE_URL;
}

async function bridgeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${bridgeUrl()}${path}`, init);
  if (!response.ok) {
    throw new Error(`Bridge error (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function checkBridge(): Promise<BridgeHealth | null> {
  try {
    return await bridgeFetch<BridgeHealth>("/health");
  } catch {
    return null;
  }
}

export type ScanMode = "enroll" | "verify";

/** enroll = cadastro (~3 toques); verify = login/confirmação (1 toque). */
export async function scanSingle(options?: {
  timeoutMs?: number;
  mode?: ScanMode;
}): Promise<ScanResponse> {
  const params = new URLSearchParams();
  if (options?.timeoutMs) params.set("timeoutMs", String(options.timeoutMs));
  params.set("mode", options?.mode ?? "enroll");
  const query = params.toString();
  return bridgeFetch<ScanResponse>(`/scan/single?${query}`);
}

export async function verifyTemplate(
  templateBase64: string,
  storedTemplateBase64: string
): Promise<VerifyResponse> {
  return bridgeFetch<VerifyResponse>("/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateBase64, storedTemplateBase64 }),
  });
}

/** Confirmação com 1 toque no leitor (FTRVerify ao vivo). */
export async function verifyLive(
  storedTemplateBase64: string,
  timeoutMs = 60000
): Promise<VerifyResponse> {
  return bridgeFetch<VerifyResponse>("/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storedTemplateBase64, timeoutMs }),
  });
}

export async function identifyUser(
  templates: BiometricTemplateEntry[],
  liveTemplateBase64?: string
): Promise<IdentifyResponse> {
  return bridgeFetch<IdentifyResponse>("/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      liveTemplateBase64,
      templates,
      timeoutMs: 60000,
    }),
  });
}

export async function fetchPortalTemplates(): Promise<BiometricTemplateEntry[]> {
  const response = await fetch("/api/auth/biometric/templates");
  if (!response.ok) {
    throw new Error("Não foi possível carregar templates biométricos.");
  }
  const data = await response.json();
  return data.templates ?? [];
}

export async function loginWithBiometric(userId: string) {
  return fetch("/api/auth/biometric/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

export async function registerBiometric(payload: {
  prontuario: string;
  password?: string;
  templateBase64: string;
  fingerLabel?: string;
}) {
  return fetch("/api/auth/biometric/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function checkBiometricStatus(prontuario: string) {
  const params = new URLSearchParams({ prontuario });
  return fetch(`/api/auth/biometric/status?${params.toString()}`);
}
