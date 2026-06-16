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

type Challenge = {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
};

type RankingEntry = {
  name: string;
  totalPoints: number;
};

const QUIZ_QUESTIONS = [
  {
    question: "Qual EPI é obrigatório em áreas de produção?",
    options: ["Capacete, óculos e luvas", "Apenas crachá", "Somente botina"],
    correct: 0,
  },
  {
    question: "O que fazer em caso de incêndio?",
    options: ["Esconder-se", "Seguir rotas de fuga sinalizadas", "Usar elevador"],
    correct: 1,
  },
  {
    question: "Como reportar um quase-acidente?",
    options: ["Ignorar", "Registrar pelo app ou supervisor", "Apenas contar colegas"],
    correct: 1,
  },
];

function LoadingState() {
  return <p className="text-slate-500 animate-pulse py-8 text-center">Carregando...</p>;
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">{message}</p>
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
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        fetch("/api/challenges"),
        fetch("/api/ranking"),
      ]);
      if (cRes.ok) setChallenge(await cRes.json());
      if (rRes.ok) setRanking(await rRes.json());
    } catch {
      setError("Erro ao carregar desafio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitQuiz() {
    if (!challenge) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const score = answers.filter((a, i) => a === QUIZ_QUESTIONS[i].correct).length;
    const passed = score >= 2;

    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          passed,
          score,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao submeter.");
      setSuccess(data.message);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSubmitting(false);
    }
  }

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
          <p className="text-sm text-slate-600 mt-2">{challenge.description}</p>
          <p className="text-sm font-medium text-purple-700 mt-2">+{challenge.points} pontos</p>

          {challenge.completed ? (
            <p className="mt-4 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm">
              ✓ Desafio concluído nesta semana!
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {QUIZ_QUESTIONS.map((q, qi) => (
                <div key={qi}>
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name={`q-${qi}`}
                          checked={answers[qi] === oi}
                          onChange={() => {
                            const next = [...answers];
                            next[qi] = oi;
                            setAnswers(next);
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
                disabled={submitting || answers.length < QUIZ_QUESTIONS.length}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-60"
              >
                {submitting ? "Enviando..." : "Concluir quiz"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-slate-500">Nenhum desafio ativo no momento.</p>
      )}

      <div className="bg-white rounded-xl p-4 shadow border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-3">🏆 Ranking Top 5</h3>
        {ranking.length === 0 ? (
          <p className="text-slate-500 text-sm">Ainda sem pontuações.</p>
        ) : (
          <ol className="space-y-2">
            {ranking.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0"
              >
                <span>
                  <span className="font-bold text-purple-600 mr-2">#{i + 1}</span>
                  {r.name}
                </span>
                <span className="font-medium text-slate-700">{r.totalPoints} pts</span>
              </li>
            ))}
          </ol>
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
