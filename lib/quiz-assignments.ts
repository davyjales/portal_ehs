import { prisma } from "@/lib/prisma";
import {
  QUIZ_QUESTIONS_PER_CHALLENGE,
  shuffle,
} from "@/lib/quiz";

export async function clearQuizAttempt(userId: string, challengeId: string) {
  await prisma.$transaction([
    prisma.userQuizAssignment.deleteMany({ where: { userId, challengeId } }),
    prisma.userQuizSession.deleteMany({ where: { userId, challengeId } }),
  ]);
}

async function selectQuestionsForUser(userId: string, challengeId: string) {
  const pool = await prisma.quizQuestion.findMany({ where: { active: true } });
  if (pool.length === 0) return [];

  const previouslyUsed = await prisma.userQuizAssignment.findMany({
    where: { userId, challengeId: { not: challengeId } },
    select: { questionId: true },
  });
  const usedIds = new Set(previouslyUsed.map((a) => a.questionId));

  const unused = pool.filter((q) => !usedIds.has(q.id));
  const used = pool.filter((q) => usedIds.has(q.id));

  let selected = shuffle(unused).slice(0, QUIZ_QUESTIONS_PER_CHALLENGE);
  if (selected.length < QUIZ_QUESTIONS_PER_CHALLENGE) {
    const needed = QUIZ_QUESTIONS_PER_CHALLENGE - selected.length;
    selected = [...selected, ...shuffle(used).slice(0, needed)];
  }
  return shuffle(selected).slice(0, QUIZ_QUESTIONS_PER_CHALLENGE);
}

export async function createFreshQuizAttempt(
  userId: string,
  challengeId: string,
  pageToken: string
) {
  await clearQuizAttempt(userId, challengeId);

  const selected = await selectQuestionsForUser(userId, challengeId);
  if (selected.length === 0) return { assignments: [], session: null };

  const startedAt = new Date();

  const session = await prisma.userQuizSession.create({
    data: { userId, challengeId, pageToken, startedAt },
  });

  const assignments = await prisma.$transaction(
    selected.map((question, order) =>
      prisma.userQuizAssignment.create({
        data: { userId, challengeId, questionId: question.id, order },
      })
    )
  );

  return {
    session,
    assignments: assignments.sort((a, b) => a.order - b.order),
  };
}

export async function getQuizSession(userId: string, challengeId: string) {
  return prisma.userQuizSession.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
  });
}

export async function resolveQuizSession(
  userId: string,
  challengeId: string,
  pageToken: string
): Promise<"none" | "resume" | "stale"> {
  const session = await getQuizSession(userId, challengeId);
  if (!session) return "none";
  if (session.pageToken === pageToken) return "resume";
  await clearQuizAttempt(userId, challengeId);
  return "stale";
}

export async function assignmentsToQuestions(userId: string, challengeId: string) {
  const assignments = await prisma.userQuizAssignment.findMany({
    where: { userId, challengeId },
    orderBy: { order: "asc" },
  });
  if (assignments.length === 0) return [];

  const questionIds = assignments.map((a) => a.questionId);
  const questions = await prisma.quizQuestion.findMany({
    where: { id: { in: questionIds }, active: true },
  });
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));

  return assignments
    .map((a) => questionMap[a.questionId])
    .filter(Boolean)
    .map((q) => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options) as string[],
    }));
}

export async function getAssignedQuestionsWithAnswers(userId: string, challengeId: string) {
  const assignments = await prisma.userQuizAssignment.findMany({
    where: { userId, challengeId },
    orderBy: { order: "asc" },
  });

  if (assignments.length === 0) return [];

  const questionIds = assignments.map((a) => a.questionId);
  const questions = await prisma.quizQuestion.findMany({
    where: { id: { in: questionIds } },
  });
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));

  return assignments
    .map((a) => questionMap[a.questionId])
    .filter(Boolean);
}

export async function clearQuizSession(userId: string, challengeId: string) {
  await prisma.userQuizSession.deleteMany({ where: { userId, challengeId } });
}