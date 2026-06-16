export type PillarKey = "ENVIRONMENT" | "HEALTH" | "SAFETY";

export const PILLAR_CONFIG: Record<
  PillarKey,
  {
    letter: string;
    label: string;
    color: string;
    accentLight: string;
    bgColor: string;
    bgImage: string;
    textOnTheme: string;
  }
> = {
  ENVIRONMENT: {
    letter: "E",
    label: "Environment",
    color: "#15803d",
    accentLight: "#22c55e",
    bgColor: "#14532d",
    bgImage: "/backgrounds/environment.jpg",
    textOnTheme: "#ffffff",
  },
  HEALTH: {
    letter: "H",
    label: "Health",
    color: "#16a34a",
    accentLight: "#86efac",
    bgColor: "#f0fdf4",
    bgImage: "/backgrounds/health.jpg",
    textOnTheme: "#14532d",
  },
  SAFETY: {
    letter: "S",
    label: "Safety",
    color: "#ea580c",
    accentLight: "#fb923c",
    bgColor: "#c2410c",
    bgImage: "/backgrounds/safety.jpg",
    textOnTheme: "#ffffff",
  },
};

export const PILLARS: PillarKey[] = ["ENVIRONMENT", "HEALTH", "SAFETY"];

export const NEUTRAL_BG =
  "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)";

export const TEAM_BG_IMAGE = "/backgrounds/ehs_team.jpg";

export const TEAM_BG_OVERLAY =
  "linear-gradient(135deg, rgba(241,245,249,0.88) 0%, rgba(226,232,240,0.82) 45%, rgba(203,213,225,0.78) 100%)";

export const INFO_ROTATE_MS = 6000;
export const IDLE_AUTO_START_MS = 30000;
/** Segundos para uma volta completa do triângulo E/H/S (menor = mais rápido) */
export const TRIANGLE_ROTATE_SEC = ;

export function parseEHSImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function pillarFromKey(key: string | null): PillarKey | null {
  if (key === "ENVIRONMENT" || key === "HEALTH" || key === "SAFETY") return key;
  return null;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const ALERT_TYPE_LABELS: Record<string, string> = {
  INFO: "Informativo",
  WARNING: "Atenção",
  URGENT: "Urgente",
};

export const SOLICITACAO_TYPE_LABELS: Record<string, string> = {
  CHAMADO: "Chamado",
  RECLAMACAO: "Reclamação",
  SUGESTAO: "Sugestão",
};

export const SOLICITACAO_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em andamento",
  CLOSED: "Encerrada",
};

export const PENDENCIA_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  DONE: "Concluída",
};
