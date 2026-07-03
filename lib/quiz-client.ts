const PAGE_TOKEN_KEY = "ehs-quiz-page-token";

export function getQuizPageToken(): string {
  if (typeof window === "undefined") return "";

  let token = sessionStorage.getItem(PAGE_TOKEN_KEY);
  if (!token) {
    token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(PAGE_TOKEN_KEY, token);
  }
  return token;
}

/** Gera novo token — usado após login ou recarregamento completo da página. */
export function rotateQuizPageToken(): string {
  if (typeof window === "undefined") return "";

  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(PAGE_TOKEN_KEY, token);
  return token;
}

/** Garante token na sessão sem invalidar tentativa em andamento (evita refazer quiz no F5). */
export function initQuizPageTokenOnLoad(): string {
  if (typeof window === "undefined") return "";
  return getQuizPageToken();
}
