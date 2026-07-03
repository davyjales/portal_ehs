import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden } from "@/lib/api-helpers";
import { formatDate, formatDateTime } from "@/lib/ehs";

function csvEscape(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const type = request.nextUrl.searchParams.get("type");
  const format = request.nextUrl.searchParams.get("format");

  if (type === "pendencias") {
    const pendencias = await prisma.pendencia.findMany({
      include: { user: { select: { name: true, prontuario: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    const rows = pendencias.map((p) => ({
      id: p.id,
      titulo: p.title,
      funcionario: p.user.name,
      prontuario: p.user.prontuario,
      status: p.status === "DONE" ? "Concluída" : "Aberta",
      prazo: formatDate(p.dueDate),
      criadaEm: formatDateTime(p.createdAt),
      resolvidaEm: p.resolvedAt ? formatDateTime(p.resolvedAt) : "—",
    }));

    if (format === "csv") {
      const header = "Título,Funcionário,Prontuário,Status,Prazo,Criada em,Resolvida em";
      const body = rows
        .map((r) =>
          [
            csvEscape(r.titulo),
            csvEscape(r.funcionario),
            csvEscape(r.prontuario),
            csvEscape(r.status),
            csvEscape(r.prazo),
            csvEscape(r.criadaEm),
            csvEscape(r.resolvidaEm),
          ].join(",")
        )
        .join("\n");
      return new NextResponse(`${header}\n${body}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="relatorio-pendencias.csv"',
        },
      });
    }

    const resolvidas = rows.filter((r) => r.status === "Concluída").length;
    return NextResponse.json({
      summary: {
        total: rows.length,
        resolvidas,
        pendentes: rows.length - resolvidas,
      },
      rows,
    });
  }

  if (type === "alertas") {
    const [alertas, employees, acks] = await Promise.all([
      prisma.alerta.findMany({
        include: {
          user: { select: { name: true, prontuario: true } },
          acknowledgments: {
            include: { user: { select: { name: true, prontuario: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "EMPLOYEE" },
        select: { id: true, name: true, prontuario: true },
        orderBy: { name: "asc" },
      }),
      prisma.alertaAcknowledgment.findMany({
        include: { user: { select: { name: true, prontuario: true } } },
      }),
    ]);

    const rows: {
      alertaId: string;
      titulo: string;
      tipo: string;
      destino: string;
      funcionario: string;
      prontuario: string;
      ciencia: string;
      cienciaEm: string;
    }[] = [];

    for (const alerta of alertas) {
      if (alerta.userId) {
        const acked =
          alerta.acknowledgedAt != null
            ? "Sim"
            : alerta.acknowledgments.some((a) => a.userId === alerta.userId)
              ? "Sim"
              : "Não";
        const ackDate =
          alerta.acknowledgedAt?.toISOString() ??
          alerta.acknowledgments.find((a) => a.userId === alerta.userId)?.acknowledgedAt.toISOString() ??
          null;

        rows.push({
          alertaId: alerta.id,
          titulo: alerta.title,
          tipo: alerta.type,
          destino: "Individual",
          funcionario: alerta.user?.name ?? "—",
          prontuario: alerta.user?.prontuario ?? "—",
          ciencia: acked,
          cienciaEm: ackDate ? formatDateTime(ackDate) : "—",
        });
      } else {
        for (const emp of employees) {
          const ack = alerta.acknowledgments.find((a) => a.userId === emp.id);
          rows.push({
            alertaId: alerta.id,
            titulo: alerta.title,
            tipo: alerta.type,
            destino: "Todos",
            funcionario: emp.name,
            prontuario: emp.prontuario,
            ciencia: ack ? "Sim" : "Não",
            cienciaEm: ack ? formatDateTime(ack.acknowledgedAt) : "—",
          });
        }
      }
    }

    if (format === "csv") {
      const header = "Alerta,Tipo,Destino,Funcionário,Prontuário,Ciência,Ciência em";
      const body = rows
        .map((r) =>
          [
            csvEscape(r.titulo),
            csvEscape(r.tipo),
            csvEscape(r.destino),
            csvEscape(r.funcionario),
            csvEscape(r.prontuario),
            csvEscape(r.ciencia),
            csvEscape(r.cienciaEm),
          ].join(",")
        )
        .join("\n");
      return new NextResponse(`${header}\n${body}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="relatorio-alertas.csv"',
        },
      });
    }

    const comCiencia = rows.filter((r) => r.ciencia === "Sim").length;
    return NextResponse.json({
      summary: {
        total: rows.length,
        comCiencia,
        semCiencia: rows.length - comCiencia,
      },
      rows,
    });
  }

  return NextResponse.json({ error: "Tipo de relatório inválido." }, { status: 400 });
}
