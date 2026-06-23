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

/** Chamado uma vez por carregamento completo do documento (refresh / nova aba). */
export function initQuizPageTokenOnLoad(): string {
  if (typeof window === "undefined") return "";
  return rotateQuizPageToken();
}
