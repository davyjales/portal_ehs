import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { currentMonthKey, startOfMonth } from "@/lib/quiz";

type RankingRow = {
  userId: string;
  name: string;
  totalPoints: number;
  responseTimeMs: number;
  rank: number;
};

export async function GET(request: NextRequest) {
  const monthStart = startOfMonth();
  const session = await requireAuth(request);

  const scores = await prisma.userScore.findMany({
    where: { completedAt: { gte: monthStart } },
    select: {
      userId: true,
      points: true,
      responseTimeMs: true,
    },
  });

  const byUser = new Map<
    string,
    { totalPoints: number; responseTimeMs: number }
  >();

  for (const score of scores) {
    const current = byUser.get(score.userId) ?? {
      totalPoints: 0,
      responseTimeMs: 0,
    };
    byUser.set(score.userId, {
      totalPoints: current.totalPoints + score.points,
      responseTimeMs: current.responseTimeMs + score.responseTimeMs,
    });
  }

  const userIds = [...byUser.keys()];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const sorted: RankingRow[] = [...byUser.entries()]
    .map(([userId, data]) => ({
      userId,
      name: userMap[userId] || "Colaborador",
      totalPoints: data.totalPoints,
      responseTimeMs: data.responseTimeMs,
      rank: 0,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.responseTimeMs - b.responseTimeMs;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const top5 = sorted.slice(0, 5);
  const currentUser = session
    ? sorted.find((entry) => entry.userId === session.id)
    : undefined;

  return NextResponse.json({
    month: currentMonthKey(),
    top5,
    all: sorted,
    currentUser,
  });
}
