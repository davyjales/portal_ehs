import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const scores = (
    await prisma.userScore.groupBy({
      by: ["userId"],
      _sum: { points: true },
    })
  )
    .sort((a, b) => (b._sum.points || 0) - (a._sum.points || 0))
    .slice(0, 5);

  const userIds = scores.map((s) => s.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const ranking = scores.map((s) => ({
    name: userMap[s.userId] || "Colaborador",
    totalPoints: s._sum.points || 0,
  }));

  return NextResponse.json(ranking);
}
