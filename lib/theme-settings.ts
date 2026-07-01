import { PILLAR_CONFIG, TEAM_BG_IMAGE, type PillarKey } from "@/lib/ehs";

export type ThemeBackgrounds = Record<PillarKey, string> & { team: string };

export const DEFAULT_THEME_BACKGROUNDS: ThemeBackgrounds = {
  ENVIRONMENT: PILLAR_CONFIG.ENVIRONMENT.bgImage,
  HEALTH: PILLAR_CONFIG.HEALTH.bgImage,
  SAFETY: PILLAR_CONFIG.SAFETY.bgImage,
  team: TEAM_BG_IMAGE,
};

export function themeBackgroundsFromRow(row: {
  environmentImage: string;
  healthImage: string;
  safetyImage: string;
  teamImage: string;
}): ThemeBackgrounds {
  return {
    ENVIRONMENT: row.environmentImage || DEFAULT_THEME_BACKGROUNDS.ENVIRONMENT,
    HEALTH: row.healthImage || DEFAULT_THEME_BACKGROUNDS.HEALTH,
    SAFETY: row.safetyImage || DEFAULT_THEME_BACKGROUNDS.SAFETY,
    team: row.teamImage || DEFAULT_THEME_BACKGROUNDS.team,
  };
}
