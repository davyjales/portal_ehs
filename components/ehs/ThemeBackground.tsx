"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  PILLAR_CONFIG,
  NEUTRAL_BG,
  TEAM_BG_IMAGE,
  TEAM_BG_OVERLAY,
  type PillarKey,
} from "@/lib/ehs";

type Point = { x: number; y: number };

export function ThemeBackground({
  selected,
  origin,
}: {
  selected: PillarKey | null;
  origin: Point | null;
}) {
  const config = selected ? PILLAR_CONFIG[selected] : null;
  const originX = origin?.x ?? 0;
  const originY = origin?.y ?? 0;
  const isHealth = selected === "HEALTH";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ background: NEUTRAL_BG }} />

      {!selected && (
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${TEAM_BG_IMAGE})` }}
          />
          <div className="absolute inset-0" style={{ background: TEAM_BG_OVERLAY }} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {config && selected && (
          <motion.div
            key={selected}
            className="absolute inset-0"
            initial={{ clipPath: `circle(0% at ${originX}px ${originY}px)` }}
            animate={{ clipPath: `circle(150% at ${originX}px ${originY}px)` }}
            exit={{ clipPath: `circle(0% at ${originX}px ${originY}px)` }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${config.bgImage})` }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: isHealth
                  ? "linear-gradient(165deg, rgba(255,255,255,0.94) 0%, rgba(240,253,244,0.88) 40%, rgba(187,247,208,0.65) 100%)"
                  : selected === "ENVIRONMENT"
                    ? "linear-gradient(165deg, rgba(20,83,45,0.92) 0%, rgba(21,128,61,0.82) 45%, rgba(22,101,52,0.72) 100%)"
                    : "linear-gradient(165deg, rgba(154,52,18,0.92) 0%, rgba(234,88,12,0.78) 45%, rgba(251,146,60,0.62) 100%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
