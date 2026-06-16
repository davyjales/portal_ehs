import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

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

  return NextResponse.json({
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    points: challenge.points,
    completed: !!existing,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const { challengeId, passed } = await request.json();

  if (!challengeId) return badRequest("Desafio obrigatório.");

  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, active: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
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
    return badRequest("Você já concluiu este desafio.");
  }

  if (!passed) {
    return badRequest("Respostas insuficientes. Tente novamente!");
  }

  await prisma.userScore.create({
    data: {
      userId: user.id,
      challengeId: challenge.id,
      points: challenge.points,
    },
  });

  return NextResponse.json({
    message: `Parabéns! Você ganhou ${challenge.points} pontos!`,
  });
}
