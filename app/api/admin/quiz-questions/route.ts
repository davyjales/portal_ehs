import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  return [];
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const questions = await prisma.quizQuestion.findMany({
    orderBy: { question: "asc" },
  });

  return NextResponse.json(
    questions.map((q) => ({
      ...q,
      options: JSON.parse(q.options) as string[],
    }))
  );
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { question, options, correct, active } = await request.json();
  const opts = parseOptions(options);

  if (!question?.trim() || opts.length < 2) {
    return badRequest("Informe a pergunta e pelo menos 2 opções.");
  }

  const correctIndex = Number(correct);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= opts.length) {
    return badRequest("Selecione a resposta correta.");
  }

  await prisma.quizQuestion.create({
    data: {
      question: question.trim(),
      options: JSON.stringify(opts),
      correct: correctIndex,
      active: active !== false,
    },
  });

  return NextResponse.json({ message: "Pergunta criada com sucesso!" });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { id, question, options, correct, active } = await request.json();
  if (!id) return badRequest("ID obrigatório.");

  const existing = await prisma.quizQuestion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pergunta não encontrada." }, { status: 404 });
  }

  const opts = parseOptions(options);
  if (!question?.trim() || opts.length < 2) {
    return badRequest("Informe a pergunta e pelo menos 2 opções.");
  }

  const correctIndex = Number(correct);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= opts.length) {
    return badRequest("Selecione a resposta correta.");
  }

  await prisma.quizQuestion.update({
    where: { id },
    data: {
      question: question.trim(),
      options: JSON.stringify(opts),
      correct: correctIndex,
      active: active !== false,
    },
  });

  return NextResponse.json({ message: "Pergunta atualizada!" });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("ID obrigatório.");

  await prisma.quizQuestion.delete({ where: { id } });
  return NextResponse.json({ message: "Pergunta excluída." });
}
