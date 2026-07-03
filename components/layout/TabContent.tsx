"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatDate,
  formatDateTime,
  ALERT_TYPE_LABELS,
  PENDENCIA_STATUS_LABELS,
  SOLICITACAO_TYPE_LABELS,
  SOLICITACAO_STATUS_LABELS,
} from "@/lib/ehs";
import { getQuizPageToken } from "@/lib/quiz-client";
import type { QuizReviewItem } from "@/lib/quiz";
import { touchKeyboardProps } from "@/lib/touch-keyboard";
import type { TabId } from "./AppHeader";

type Pendencia = {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
};

type Alerta = {
  id: string;
  title: string;
  message: string;
  type: string;
  expiresAt: string | null;
  acknowledgedAt: string | null;
};

type Certificado = {
  id: string;
  trainingName: string;
  filePath: string;
  issuedAt: string;
};

type Solicitacao = {
  id: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
};

type Challenge = {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  inProgress: boolean;
  weeklyBlocked?: boolean;
  blockedMessage?: string;
  questions: QuizQuestion[];
  startedAt: string | null;
  earnedPoints?: number;
  correctCount?: number;
  totalQuestions?: number;
  review?: QuizReviewItem[];
};

function quizAnswersKey(challengeId: string, pageToken: string) {
  return `ehs-quiz-answers-${challengeId}-${pageToken}`;
}

function loadSavedAnswers(challengeId: string, pageToken: string, count: number): number[] {
  if (typeof window === "undefined") return Array(count).fill(-1);
  try {
    const raw = sessionStorage.getItem(quizAnswersKey(challengeId, pageToken));
    if (!raw) return Array(count).fill(-1);
    const parsed = JSON.parse(raw) as number[];
    if (Array.isArray(parsed) && parsed.length === count) return parsed;
  } catch {
    /* ignore */
  }
  return Array(count).fill(-1);
}

function saveAnswers(challengeId: string, pageToken: string, answers: number[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(quizAnswersKey(challengeId, pageToken), JSON.stringify(answers));
}

function clearSavedAnswers(challengeId: string, pageToken: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(quizAnswersKey(challengeId, pageToken));
}

type RankingEntry = {
  userId: string;
  name: string;
  totalPoints: number;
  responseTimeMs: number;
  rank: number;
};

type RankingResponse = {
  month: string;
  top5: RankingEntry[];
  all: RankingEntry[];
  currentUser?: RankingEntry;
};

function LoadingState() {
  return <p className="text-slate-500 animate-pulse py-8 text-center">Carregando...</p>;
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">{message}</p>
  );
}

function QuizReviewPanel({
  review,
  earnedPoints,
  correctCount,
  totalQuestions,
}: {
  review: QuizReviewItem[];
  earnedPoints: number;
  correctCount: number;
  totalQuestions: number;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-3">
        <p className="text-sm font-semibold text-purple-900">Resultado do quiz</p>
        <p className="text-lg font-bold text-purple-800 mt-1">
          {earnedPoints} pontos · {correctCount}/{totalQuestions} acertos
        </p>
      </div>

      <div className="space-y-5">
        {review.map((item, qi) => (
          <div key={item.questionId} className="border border-slate-100 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-800 mb-3">
              {qi + 1}. {item.question}
            </p>
            <div className="space-y-2">
              {item.options.map((opt, oi) => {
                const isCorrect = oi === item.correctAnswer;

                return (
                  <div
                    key={oi}
                    className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                      isCorrect
                        ? "bg-green-50 text-green-900 border border-green-200"
                        : "bg-red-50 text-red-900 border border-red-200"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold ${
                        isCorrect ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {isCorrect ? "✔️" : "✕"}
                    </span>
                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendenciasTab() {
  const [items, setItems] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pendencias");
      if (!res.ok) throw new Error("Erro ao carregar pendências.");
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string) {
    const res = await fetch("/api/pendencias", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Suas pendências</h2>
      {items.length === 0 ? (
        <p className="text-slate-500">Nenhuma pendência no momento.</p>
      ) : (
        items.map((p) => (
          <div key={p.id} className="bg-white rounded-xl p-4 sm:p-5 shadow border border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-slate-800">{p.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{p.description}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Prazo: {formatDate(p.dueDate)} ·{" "}
                  {PENDENCIA_STATUS_LABELS[p.status] || p.status}
                </p>
              </div>
              {p.status === "OPEN" && (
                <button
                  type="button"
                  onClick={() => resolve(p.id)}
                  className="shrink-0 px-8 py-3 text-base font-medium rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Resolver
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AlertasTab() {
  const [items, setItems] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/alertas");
      if (!res.ok) throw new Error("Erro ao carregar alertas.");
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function acknowledge(id: string) {
    const res = await fetch("/api/alertas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const typeColors: Record<string, string> = {
    INFO: "border-blue-200 bg-blue-50",
    WARNING: "border-amber-200 bg-amber-50",
    URGENT: "border-red-200 bg-red-50",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Alertas</h2>
      {items.length === 0 ? (
        <p className="text-slate-500">Nenhum alerta no momento.</p>
      ) : (
        items.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl p-4 sm:p-5 border ${typeColors[a.type] || "border-slate-200 bg-white"}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  {ALERT_TYPE_LABELS[a.type] || a.type}
                </span>
                <h3 className="font-medium text-slate-800 mt-1">{a.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{a.message}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Validade: {formatDate(a.expiresAt)}
                  {a.acknowledgedAt && ` · Ciência em ${formatDateTime(a.acknowledgedAt)}`}
                </p>
              </div>
              {!a.acknowledgedAt && (
                <button
                  type="button"
                  onClick={() => acknowledge(a.id)}
                  className="shrink-0 px-8 py-3 text-base font-medium rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                >
                  Ciência
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CertificadosTab() {
  const [items, setItems] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/certificados")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar certificados.");
        return res.json();
      })
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Certificados</h2>
      {items.length === 0 ? (
        <p className="text-slate-500">Nenhum certificado disponível.</p>
      ) : (
        items.map((c) => {
          const mailSubject = encodeURIComponent(`Certificado: ${c.trainingName}`);
          const mailBody = encodeURIComponent(
            `Segue meu certificado de ${c.trainingName}.\nLink: ${window.location.origin}${c.filePath}`
          );
          const waText = encodeURIComponent(
            `Olá! Compartilho meu certificado de ${c.trainingName}: ${window.location.origin}${c.filePath}`
          );

          return (
            <div
              key={c.id}
              className="bg-white rounded-xl p-4 sm:p-5 shadow border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-red-50 border border-red-100 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-red-600 uppercase leading-none">PDF</span>
                  <svg
                    className="w-6 h-6 text-red-500 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-800 truncate">{c.trainingName}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Emitido em {formatDate(c.issuedAt)}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {c.filePath.split("/").pop()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <a
                  href={c.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 font-medium"
                >
                  Abrir PDF
                </a>
                <a
                  href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
                  className="text-sm px-3 py-2 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  E-mail
                </a>
                <a
                  href={`https://wa.me/?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-3 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function SolicitacoesTab() {
  const [items, setItems] = useState<Solicitacao[]>([]);
  const [type, setType] = useState("CHAMADO");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/solicitacoes");
      if (!res.ok) throw new Error("Erro ao carregar solicitações.");
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao enviar.");
      }
      setMessage("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Nova solicitação</h2>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow border border-slate-100 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200"
            >
              <option value="CHAMADO">Chamado</option>
              <option value="RECLAMACAO">Reclamação</option>
              <option value="SUGESTAO">Sugestão</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-slate-200"
              placeholder="Descreva sua solicitação..."
              {...touchKeyboardProps()}
            />
          </div>
          {error && <ErrorState message={error} />}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Enviar solicitação"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Histórico</h2>
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <p className="text-slate-500">Nenhuma solicitação enviada.</p>
        ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-4 shadow border border-slate-100">
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-1">
                  <span>{SOLICITACAO_TYPE_LABELS[s.type]}</span>
                  <span>·</span>
                  <span>{SOLICITACAO_STATUS_LABELS[s.status]}</span>
                  <span>·</span>
                  <span>{formatDateTime(s.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700">{s.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OneUpTab() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pageToken = getQuizPageToken();
      const [cRes, rRes, meRes] = await Promise.all([
        fetch(`/api/challenges?pageToken=${encodeURIComponent(pageToken)}`),
        fetch("/api/ranking"),
        fetch("/api/auth/me"),
      ]);
      if (cRes.ok) {
        const data: Challenge | null = await cRes.json();
        setChallenge(data);
        if (data?.inProgress && data.questions?.length && !data.completed) {
          setAnswers(loadSavedAnswers(data.id, pageToken, data.questions.length));
        } else {
          setAnswers([]);
        }
      }
      if (rRes.ok) setRanking(await rRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUserId(me.id ?? null);
      }
    } catch {
      setError("Erro ao carregar desafio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startQuiz() {
    if (!challenge) return;
    setStarting(true);
    setError(null);

    const pageToken = getQuizPageToken();

    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          challengeId: challenge.id,
          pageToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar quiz.");

      const questions: QuizQuestion[] = data.questions ?? [];
      setChallenge({
        ...challenge,
        inProgress: true,
        questions,
        startedAt: data.startedAt ?? null,
      });
      setAnswers(loadSavedAnswers(challenge.id, pageToken, questions.length));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setStarting(false);
    }
  }

  async function submitQuiz() {
    if (!challenge) return;
    const questions = challenge.questions ?? [];
    if (questions.length === 0) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao submeter.");
      clearSavedAnswers(challenge.id, getQuizPageToken());
      setChallenge({
        ...challenge,
        completed: true,
        inProgress: false,
        questions: [],
        earnedPoints: data.earnedPoints,
        correctCount: data.correctCount,
        totalQuestions: data.totalQuestions,
        review: data.review ?? [],
      });
      setSuccess(data.message);
      setAnswers([]);
      fetch("/api/ranking")
        .then((r) => r.ok && r.json())
        .then((r) => r && setRanking(r));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSubmitting(false);
    }
  }

  const questions = challenge?.questions ?? [];
  const allAnswered =
    questions.length > 0 && answers.length === questions.length && answers.every((a) => a >= 0);
  const inProgress = challenge?.inProgress && !challenge.completed && questions.length > 0;

  const rankingList =
    showFullRanking && ranking ? ranking.all : ranking?.top5 ?? [];

  const monthLabel = ranking?.month
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
        new Date(`${ranking.month}-01T12:00:00`)
      )
    : "";

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl p-6 shadow-lg">
        <p className="text-purple-200 text-sm uppercase tracking-wide">Gamificação</p>
        <h2 className="text-2xl font-bold mt-1">1UP — Desafio da Semana</h2>
      </div>

      {challenge ? (
        <div className="bg-white rounded-xl p-4 shadow border border-slate-100">
          <h3 className="font-semibold text-slate-800">{challenge.title}</h3>

          {challenge.completed ? (
            <>
              <p className="text-sm text-slate-600 mt-2">{challenge.description}</p>
              {challenge.weeklyBlocked && challenge.blockedMessage && (
                <p className="mt-4 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-sm">
                  {challenge.blockedMessage}
                </p>
              )}
              {success && (
                <p className="mt-4 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm">{success}</p>
              )}
              {!success && !challenge.weeklyBlocked && (
                <p className="mt-4 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm">
                  ✓ Desafio concluído nesta semana!
                </p>
              )}
              {challenge.review && challenge.review.length > 0 && (
                <QuizReviewPanel
                  review={challenge.review}
                  earnedPoints={challenge.earnedPoints ?? 0}
                  correctCount={challenge.correctCount ?? 0}
                  totalQuestions={challenge.totalQuestions ?? challenge.review.length}
                />
              )}
            </>
          ) : inProgress ? (
            <>
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-3">
                Quiz em andamento — o tempo continua contando desde que você iniciou.
              </p>
              <div className="mt-4 space-y-4">
                {questions.map((q, qi) => (
                  <div key={q.id}>
                    <p className="text-sm font-medium text-slate-800 mb-2">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="space-y-1">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={answers[qi] === oi}
                            onChange={() => {
                              const next = [...answers];
                              next[qi] = oi;
                              setAnswers(next);
                              saveAnswers(challenge.id, getQuizPageToken(), next);
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {error && <ErrorState message={error} />}
                {success && (
                  <p className="text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm">{success}</p>
                )}
                <button
                  type="button"
                  onClick={submitQuiz}
                  disabled={submitting || !allAnswered}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-60"
                >
                  {submitting ? "Enviando..." : "Concluir quiz"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  O <strong className="text-slate-800">1UP</strong> é a gamificação do Portal EHS.
                  Participe do quiz semanal para testar seus conhecimentos em Environment, Health e Safety.
                </p>
                <p>
                  <strong className="text-slate-800">Regras:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>São 3 perguntas sorteadas do banco de questões EHS.</li>
                  <li>Os pontos são proporcionais ao número de acertos (até {challenge.points} pts).</li>
                  <li>Ao concluir, você verá sua pontuação e o gabarito de cada pergunta.</li>
                  <li>O cronômetro inicia ao clicar em <strong>Iniciar Quiz</strong> e não pausa ao trocar de aba.</li>
                  <li>Cada colaborador pode realizar <strong>apenas 1 quiz por semana</strong>.</li>
                  <li>Em caso de empate no ranking mensal, vence quem respondeu mais rápido.</li>
                </ul>
                <p className="text-purple-700 font-medium">
                  Pronto para participar? Clique abaixo quando quiser começar.
                </p>
              </div>
              {error && <div className="mt-4"><ErrorState message={error} /></div>}
              <button
                type="button"
                onClick={startQuiz}
                disabled={starting}
                className="mt-4 px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60"
              >
                {starting ? "Preparando quiz..." : "Iniciar Quiz"}
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="text-slate-500">Nenhum desafio ativo no momento.</p>
      )}

      <div className="bg-white rounded-xl p-4 shadow border border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-slate-800">🏆 Ranking Mensal</h3>
          {monthLabel && (
            <span className="text-xs text-slate-500 capitalize">{monthLabel}</span>
          )}
        </div>

        {!ranking || ranking.all.length === 0 ? (
          <p className="text-slate-500 text-sm">Ainda sem pontuações neste mês.</p>
        ) : (
          <>
            <ol className="space-y-2">
              {rankingList.map((r) => {
                const isCurrentUser = currentUserId === r.userId;
                return (
                  <li
                    key={r.userId}
                    className={`flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0 rounded-lg px-2 -mx-2 ${
                      isCurrentUser ? "bg-purple-50 border border-purple-200" : ""
                    }`}
                  >
                    <span>
                      <span className="font-bold text-purple-600 mr-2">#{r.rank}</span>
                      {r.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-purple-600 font-medium">(você)</span>
                      )}
                    </span>
                    <span className="font-medium text-slate-700">{r.totalPoints} pts</span>
                  </li>
                );
              })}
            </ol>

            {ranking.all.length > 5 && (
              <button
                type="button"
                onClick={() => setShowFullRanking((v) => !v)}
                className="mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                {showFullRanking ? "Mostrar menos" : "Ver ranking completo"}
              </button>
            )}

            {ranking.currentUser && ranking.currentUser.rank > 5 && (
              <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200 text-sm">
                <span className="font-medium text-purple-800">Sua posição: </span>
                <span className="text-purple-700">
                  #{ranking.currentUser.rank} — {ranking.currentUser.name} —{" "}
                  {ranking.currentUser.totalPoints} pts
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function TabContent({ tab }: { tab: TabId }) {
  const fullWidth =
    tab === "pendencias" ||
    tab === "alertas" ||
    tab === "certificados" ||
    tab === "solicitacoes";

  return (
    <div className={`w-full px-4 py-6 ${fullWidth ? "" : "max-w-3xl mx-auto"}`}>
      {tab === "pendencias" && <PendenciasTab />}
      {tab === "alertas" && <AlertasTab />}
      {tab === "certificados" && <CertificadosTab />}
      {tab === "solicitacoes" && <SolicitacoesTab />}
      {tab === "oneup" && <OneUpTab />}
    </div>
  );
}
