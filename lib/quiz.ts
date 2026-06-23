const TIMEZONE = "America/Sao_Paulo";

export function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function startOfMonth(date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);

  return new Date(Date.UTC(year, month - 1, 1, 3, 0, 0));
}

export function currentMonthLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

export function currentMonthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function truncateSummary(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export const QUIZ_QUESTIONS_PER_CHALLENGE = 3;
export const QUIZ_PASS_THRESHOLD = 2;

export function calculateQuizPoints(
  correctCount: number,
  totalQuestions: number,
  maxPoints: number
): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctCount / totalQuestions) * maxPoints);
}
