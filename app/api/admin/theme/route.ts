import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";
import {
  DEFAULT_THEME_BACKGROUNDS,
  type ThemeBackgrounds,
} from "@/lib/theme-settings";
import { ensureThemeSettings, getThemeBackgrounds } from "@/lib/theme-settings-server";

function parseThemePayload(body: Record<string, unknown>): ThemeBackgrounds | null {
  const environmentImage = String(body.environmentImage ?? "").trim();
  const healthImage = String(body.healthImage ?? "").trim();
  const safetyImage = String(body.safetyImage ?? "").trim();
  const teamImage = String(body.teamImage ?? "").trim();

  if (!environmentImage || !healthImage || !safetyImage || !teamImage) {
    return null;
  }

  return { ENVIRONMENT: environmentImage, HEALTH: healthImage, SAFETY: safetyImage, team: teamImage };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  await ensureThemeSettings();
  const backgrounds = await getThemeBackgrounds();
  return NextResponse.json(backgrounds);
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const parsed = parseThemePayload(await request.json());
  if (!parsed) {
    return badRequest("Informe as quatro imagens de fundo.");
  }

  await prisma.themeSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      environmentImage: parsed.ENVIRONMENT,
      healthImage: parsed.HEALTH,
      safetyImage: parsed.SAFETY,
      teamImage: parsed.team,
    },
    update: {
      environmentImage: parsed.ENVIRONMENT,
      healthImage: parsed.HEALTH,
      safetyImage: parsed.SAFETY,
      teamImage: parsed.team,
    },
  });

  return NextResponse.json({
    message: "Fundos dos temas atualizados com sucesso!",
    backgrounds: parsed,
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  await prisma.themeSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      environmentImage: DEFAULT_THEME_BACKGROUNDS.ENVIRONMENT,
      healthImage: DEFAULT_THEME_BACKGROUNDS.HEALTH,
      safetyImage: DEFAULT_THEME_BACKGROUNDS.SAFETY,
      teamImage: DEFAULT_THEME_BACKGROUNDS.team,
    },
    update: {
      environmentImage: DEFAULT_THEME_BACKGROUNDS.ENVIRONMENT,
      healthImage: DEFAULT_THEME_BACKGROUNDS.HEALTH,
      safetyImage: DEFAULT_THEME_BACKGROUNDS.SAFETY,
      teamImage: DEFAULT_THEME_BACKGROUNDS.team,
    },
  });

  return NextResponse.json({
    message: "Fundos restaurados para o padrão.",
    backgrounds: DEFAULT_THEME_BACKGROUNDS,
  });
}
