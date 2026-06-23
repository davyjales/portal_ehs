import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { truncateSummary } from "../lib/quiz";

const prisma = new PrismaClient();

const SEED_QUIZ_QUESTIONS = [
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

async function main() {
  await prisma.userQuizSession.deleteMany();
  await prisma.userQuizAssignment.deleteMany();
  await prisma.userScore.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.solicitacao.deleteMany();
  await prisma.certificado.deleteMany();
  await prisma.alerta.deleteMany();
  await prisma.pendencia.deleteMany();
  await prisma.eHSContent.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash("admin123", 10);
  const employeeHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.create({
    data: {
      prontuario: "admin",
      passwordHash: adminHash,
      name: "Administrador EHS",
      role: "ADMIN",
    },
  });

  const employee = await prisma.user.create({
    data: {
      prontuario: "12345",
      passwordHash: employeeHash,
      name: "João Silva",
      role: "EMPLOYEE",
    },
  });

  const ehsContents = [
    {
      pillar: "ENVIRONMENT" as const,
      title: "Gestão de Resíduos",
      body: "Separe resíduos recicláveis, orgânicos e perigosos conforme a sinalização da área. Consulte o manual de descarte antes de descartar materiais químicos.",
      order: 1,
    },
    {
      pillar: "ENVIRONMENT" as const,
      title: "Economia de Água",
      body: "Reporte vazamentos imediatamente e utilize torneiras com temporizador. Pequenas ações diárias reduzem o consumo em até 30%.",
      order: 2,
    },
    {
      pillar: "ENVIRONMENT" as const,
      title: "Energia Renovável",
      body: "Desligue equipamentos quando não estiver em uso. Priorize áreas com iluminação natural durante o dia.",
      order: 3,
    },
    {
      pillar: "ENVIRONMENT" as const,
      title: "Programa de Reflorestamento",
      body: "Participe das ações de plantio voluntário. Cada colaborador pode indicar uma área para revitalização.",
      order: 4,
    },
    {
      pillar: "HEALTH" as const,
      title: "Ergonomia no Trabalho",
      body: "Ajuste cadeira e monitor na altura correta. Faça pausas de 5 minutos a cada hora para alongamento.",
      order: 1,
    },
    {
      pillar: "HEALTH" as const,
      title: "Saúde Mental",
      body: "Utilize o canal de apoio psicológico disponível 24h. Conversas preventivas evitam afastamentos.",
      order: 2,
    },
    {
      pillar: "HEALTH" as const,
      title: "Exames Periódicos",
      body: "Mantenha seus exames ocupacionais em dia. Agende pelo portal de saúde ou RH.",
      order: 3,
    },
    {
      pillar: "HEALTH" as const,
      title: "Alimentação Saudável",
      body: "Aproveite o refeitório com opções balanceadas. Hidrate-se ao longo do turno.",
      order: 4,
    },
    {
      pillar: "SAFETY" as const,
      title: "EPIs Obrigatórios",
      body: "Capacete, óculos e luvas são obrigatórios em áreas de produção. Verifique validade antes de iniciar o turno.",
      order: 1,
    },
    {
      pillar: "SAFETY" as const,
      title: "Rotas de Fuga",
      body: "Conheça as saídas de emergência do seu setor. Participação nos simulados é obrigatória.",
      order: 2,
    },
    {
      pillar: "SAFETY" as const,
      title: "Reporte de Quase-Acidentes",
      body: "Registre near misses pelo app ou supervisor. Dados evitam acidentes futuros.",
      order: 3,
    },
    {
      pillar: "SAFETY" as const,
      title: "Trabalho em Altura",
      body: "Somente colaboradores certificados podem operar acima de 2 metros. Verifique cinto e pontos de ancoragem.",
      order: 4,
    },
  ];

  for (const content of ehsContents) {
    await prisma.eHSContent.create({
      data: {
        ...content,
        summary: truncateSummary(content.body),
      },
    });
  }

  await prisma.pendencia.createMany({
    data: [
      {
        userId: employee.id,
        title: "Renovar NR-35",
        description: "Certificação de trabalho em altura vence em 15 dias. Agende o treinamento.",
        status: "OPEN",
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
      {
        userId: employee.id,
        title: "Assinar política de EPIs",
        description: "Leia e assine digitalmente a nova política de equipamentos de proteção.",
        status: "OPEN",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.alerta.createMany({
    data: [
      {
        userId: employee.id,
        title: "Simulado de incêndio",
        message: "Simulado obrigatório na sexta-feira às 10h. Compareça com crachá visível.",
        type: "WARNING",
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: null,
        title: "Campanha de vacinação",
        message: "Vacina contra gripe disponível na enfermaria até o fim do mês.",
        type: "INFO",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.certificado.create({
    data: {
      userId: employee.id,
      trainingName: "NR-10 — Segurança em Instalações Elétricas",
      filePath: "/certificados/nr10-exemplo.pdf",
      issuedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.solicitacao.create({
    data: {
      userId: employee.id,
      type: "SUGESTAO",
      message: "Instalar bebedouros com filtro na área de expedição.",
      status: "IN_PROGRESS",
    },
  });

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  await prisma.challenge.create({
    data: {
      title: "Desafio EHS da Semana",
      description:
        "Responda o quiz rápido sobre segurança no trabalho. São 3 perguntas sobre EPIs, rotas de fuga e reporte de incidentes.",
      points: 50,
      weekStart,
      active: true,
    },
  });

  for (const q of SEED_QUIZ_QUESTIONS) {
    await prisma.quizQuestion.create({
      data: {
        question: q.question,
        options: JSON.stringify(q.options),
        correct: q.correct,
        active: true,
      },
    });
  }

  console.log("Seed concluído!");
  console.log("Admin: admin / admin123");
  console.log("Funcionário: 12345 / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
