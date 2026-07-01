import { prisma } from "@/lib/prisma";
import {
  DEFAULT_THEME_BACKGROUNDS,
  themeBackgroundsFromRow,
  type ThemeBackgrounds,
} from "@/lib/theme-settings";

export type { ThemeBackgrounds } from "@/lib/theme-settings";

export async function getThemeBackgrounds(): Promise<ThemeBackgrounds> {
  const row = await prisma.themeSettings.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULT_THEME_BACKGROUNDS;
  return themeBackgroundsFromRow(row);
}

export async function ensureThemeSettings() {
  await prisma.themeSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      environmentImage: DEFAULT_THEME_BACKGROUNDS.ENVIRONMENT,
      healthImage: DEFAULT_THEME_BACKGROUNDS.HEALTH,
      safetyImage: DEFAULT_THEME_BACKGROUNDS.SAFETY,
      teamImage: DEFAULT_THEME_BACKGROUNDS.team,
    },
    update: {},
  });
}
