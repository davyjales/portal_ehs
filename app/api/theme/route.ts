import { NextResponse } from "next/server";
import { ensureThemeSettings, getThemeBackgrounds } from "@/lib/theme-settings-server";

export async function GET() {
  await ensureThemeSettings();
  const backgrounds = await getThemeBackgrounds();
  return NextResponse.json(backgrounds);
}
