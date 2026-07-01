import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized, badRequest } from "@/lib/api-helpers";
import {
  buildQuizReview,
  calculateQuizPoints,
  type QuizReviewItem,
} from "@/lib/quiz";
import {
  assignmentsToQuestions,
  createFreshQuizAttempt,
  getAssignedQuestionsWithAnswers,
  getQuizSession,
  resolveQuizSession,
} from "@/lib/quiz-assignments";

function parseReviewJson(raw: string | null | undefined): QuizReviewItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const pageToken = request.nextUrl.searchParams.get("pageToken") ?? "";

  const challenge = await prisma.challenge.findFirst({
    where: { active: true },
    orderBy: { weekStart: "desc" },
  });

  if (!challenge) {
    return NextResponse.json(null);
  }

  const existing = await prisma.userScore.findUnique({
    where: {
      userId_challengeId: {
        userId: user.id,
        challengeId: challenge.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      points: challenge.points,
      completed: true,
      inProgress: false,
      questions: [],
      startedAt: null,
      earnedPoints: existing.points,
      correctCount: existing.correctCount,
      totalQuestions: parseReviewJson(existing.reviewJson).length || undefined,
      review: parseReviewJson(existing.reviewJson),
    });
  }

  const sessionState = pageToken
    ? await resolveQuizSession(user.id, challenge.id, pageToken)
    : "none";

  if (sessionState === "resume") {
    const session = await getQuizSession(user.id, challenge.id);
    const questions = await assignmentsToQuestions(user.id, challenge.id);
    return NextResponse.json({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      points: challenge.points,
      completed: false,
      inProgress: questions.length > 0,
      questions,
      startedAt: session?.startedAt.toISOString() ?? null,
    });
  }

  return NextResponse.json({
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    points: challenge.points,
    completed: false,
    inProgress: false,
    questions: [],
    startedAt: null,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const body = await request.json();
  const action = body.action as string | undefined;

  if (action === "start") {
    return handleStart(user.id, body.challengeId, body.pageToken);
  }

  return handleSubmit(user.id, body);
}

async function handleStart(
  userId: string,
  challengeId: string,
  pageToken: string
) {
  if (!challengeId || !pageToken) {
    return badRequest("Dados insuficientes para iniciar o quiz.");
  }

  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, active: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
  }

  const existing = await prisma.userScore.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  });

  if (existing) {
    return badRequest("Você já concluiu este desafio.");
  }

  const sessionState = await resolveQuizSession(userId, challenge.id, pageToken);

  if (sessionState === "resume") {
    const session = await getQuizSession(userId, challenge.id);
    const questions = await assignmentsToQuestions(userId, challenge.id);
    return NextResponse.json({
      questions,
      startedAt: session?.startedAt.toISOString() ?? null,
    });
  }

  const { session, assignments } = await createFreshQuizAttempt(
    userId,
    challenge.id,
    pageToken
  );

  if (!session || assignments.length === 0) {
    return badRequest("Nenhuma pergunta disponível para este desafio.");
  }

  const questions = await assignmentsToQuestions(userId, challenge.id);

  return NextResponse.json({
    questions,
    startedAt: session.startedAt.toISOString(),
  });
}

async function handleSubmit(
  userId: string,
  body: { challengeId?: string; answers?: number[] }
) {
  const { challengeId, answers } = body;

  if (!challengeId || !Array.isArray(answers)) {
    return badRequest("Dados do quiz inválidos.");
  }

  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, active: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
  }

  const existing = await prisma.userScore.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  });

  if (existing) {
    return badRequest("Você já concluiu este desafio.");
  }

  const session = await getQuizSession(userId, challenge.id);
  if (!session) {
    return badRequest("Inicie o quiz antes de enviar as respostas.");
  }

  const assignedQuestions = await getAssignedQuestionsWithAnswers(userId, challenge.id);

  if (assignedQuestions.length === 0) {
    return badRequest("Nenhuma pergunta disponível para este desafio.");
  }

  if (answers.length !== assignedQuestions.length) {
    return badRequest("Responda todas as perguntas.");
  }

  let correctCount = 0;
  for (let i = 0; i < assignedQuestions.length; i++) {
    if (answers[i] === assignedQuestions[i].correct) {
      correctCount += 1;
    }
  }

  const review = buildQuizReview(assignedQuestions, answers);
  const points = calculateQuizPoints(
    correctCount,
    assignedQuestions.length,
    challenge.points
  );
  const responseTimeMs = Math.max(0, Date.now() - session.startedAt.getTime());

  await prisma.$transaction([
    prisma.userScore.create({
      data: {
        userId,
        challengeId: challenge.id,
        points,
        correctCount,
        responseTimeMs,
        reviewJson: JSON.stringify(review),
      },
    }),
    prisma.userQuizAssignment.deleteMany({
      where: { userId, challengeId: challenge.id },
    }),
    prisma.userQuizSession.deleteMany({
      where: { userId, challengeId: challenge.id },
    }),
  ]);

  const total = assignedQuestions.length;
  const message =
    correctCount === total
      ? `Parabéns! Você ganhou ${points} pontos (${correctCount}/${total} acertos)!`
      : `Quiz concluído! Você ganhou ${points} pontos (${correctCount}/${total} acertos).`;

  return NextResponse.json({
    message,
    earnedPoints: points,
    correctCount,
    totalQuestions: total,
    review,
  });
}
