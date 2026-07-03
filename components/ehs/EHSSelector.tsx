"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  PILLARS,
  PILLAR_CONFIG,
  IDLE_AUTO_START_MS,
  THEME_TRANSITION_MS,
  TRIANGLE_ROTATE_SEC,
  type PillarKey,
} from "@/lib/ehs";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeBackground } from "./ThemeBackground";
import { AmbitPanel } from "./AmbitPanel";
import { useScreenWakeLock } from "@/lib/wake-lock";
import { useSessionKeepAlive } from "@/lib/session-keepalive";
import {
  DEFAULT_THEME_BACKGROUNDS,
  type ThemeBackgrounds,
} from "@/lib/theme-settings";

type Point = { x: number; y: number };

const TRIANGLE_POSITIONS: Record<PillarKey, { x: number; y: number }> = {
  ENVIRONMENT: { x: 0, y: -72 },
  HEALTH: { x: -68, y: 52 },
  SAFETY: { x: 68, y: 52 },
};

function PillarWord({ pillar }: { pillar: PillarKey }) {
  const config = PILLAR_CONFIG[pillar];
  const suffix = config.label.slice(1);

  return (
    <div className="flex items-baseline overflow-hidden min-w-0">
      {suffix.split("").map((char, i) => (
        <motion.span
          key={`${pillar}-${i}`}
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: 0.15 + i * 0.04,
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block text-xl sm:text-2xl font-bold tracking-tight"
          style={{ color: config.textOnTheme }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}

function LetterButton({
  pillar,
  active = false,
  compact = false,
  layoutId,
  onClick,
}: {
  pillar: PillarKey;
  active?: boolean;
  compact?: boolean;
  layoutId?: string;
  onClick: (origin: Point) => void;
}) {
  const config = PILLAR_CONFIG[pillar];
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const rect = ref.current?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    onClick(origin);
  };

  const sizeClass = compact
    ? "w-11 h-11 sm:w-12 sm:h-12 text-lg sm:text-xl"
    : active
      ? "w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl"
      : "w-[5.5rem] h-[5.5rem] sm:w-24 sm:h-24 text-4xl sm:text-5xl";

  return (
    <motion.button
      ref={ref}
      type="button"
      layoutId={layoutId}
      onClick={handleClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`flex items-center justify-center rounded-full shadow-2xl cursor-pointer select-none font-bold shrink-0 ${sizeClass}`}
      style={
        active
          ? {
              backgroundColor: config.color,
              color: "#fff",
              border: `2px solid ${config.accentLight}`,
              boxShadow: `0 8px 28px ${config.color}55`,
            }
          : {
              backgroundColor: "rgba(255,255,255,0.96)",
              color: config.color,
              border: `3px solid ${config.color}`,
              boxShadow: `0 10px 40px ${config.color}35`,
            }
      }
      aria-label={config.label}
      aria-current={active ? "true" : undefined}
    >
      {config.letter}
    </motion.button>
  );
}

function TriangleLetters({
  onSelect,
}: {
  onSelect: (pillar: PillarKey, origin: Point) => void;
}) {
  return (
    <div className="relative w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] flex items-center justify-center">
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: TRIANGLE_ROTATE_SEC, repeat: Infinity, ease: "linear" }}
      >
        {PILLARS.map((pillar, i) => {
          const pos = TRIANGLE_POSITIONS[pillar];
          return (
            <motion.div
              key={pillar}
              className="absolute left-1/2 top-1/2"
              style={{ x: pos.x, y: pos.y, translateX: "-50%", translateY: "-50%" }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1, rotate: -360 }}
              transition={{
                opacity: { duration: 0.4, delay: i * 0.08 },
                scale: { type: "spring", stiffness: 260, damping: 20, delay: i * 0.08 },
                rotate: { duration: TRIANGLE_ROTATE_SEC, repeat: Infinity, ease: "linear" },
              }}
            >
              <LetterButton
                pillar={pillar}
                layoutId={`pillar-${pillar}`}
                onClick={(origin) => onSelect(pillar, origin)}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function PillarStack({
  selected,
  compact,
  onSwitch,
}: {
  selected: PillarKey;
  compact?: boolean;
  onSwitch: (pillar: PillarKey, origin: Point) => void;
}) {
  const [wordReady, setWordReady] = useState(false);

  useEffect(() => {
    setWordReady(false);
    const timer = setTimeout(() => setWordReady(true), THEME_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [selected]);

  return (
    <motion.div
      className={`fixed left-4 z-50 flex flex-col gap-2 sm:gap-2.5 ${
        compact ? "top-[8.5rem] sm:top-[8rem]" : "top-4"
      }`}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {PILLARS.map((pillar) => {
        const isActive = pillar === selected;
        return (
          <div key={pillar} className="flex items-center gap-3 min-h-11 sm:min-h-12">
            <LetterButton
              pillar={pillar}
              active={isActive}
              compact={!isActive}
              layoutId={`pillar-${pillar}`}
              onClick={(origin) => onSwitch(pillar, origin)}
            />
            <div className="overflow-hidden min-w-0">
              <AnimatePresence mode="wait">
                {isActive && wordReady && (
                  <motion.div
                    key={pillar}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <PillarWord pillar={pillar} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

function LoginCornerButton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="fixed top-4 right-4 z-40"
    >
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-slate-900/90 backdrop-blur-sm text-white text-sm sm:text-base font-medium hover:bg-slate-800 transition-colors shadow-lg border border-white/10"
      >
        Área do funcionário →
      </Link>
    </motion.div>
  );
}

export function EHSSelector({
  showLoginButton = true,
  compact = false,
}: {
  showLoginButton?: boolean;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<PillarKey | null>(compact ? PILLARS[0] : null);
  const [origin, setOrigin] = useState<Point | null>(
    compact ? { x: 80, y: 140 } : null
  );
  const [backgrounds, setBackgrounds] = useState<ThemeBackgrounds>(DEFAULT_THEME_BACKGROUNDS);
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/theme")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ThemeBackgrounds | null) => {
        if (data) setBackgrounds(data);
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const handleSelect = useCallback((pillar: PillarKey, clickOrigin: Point) => {
    setOrigin(clickOrigin);
    setSelected(pillar);
  }, []);

  const handleSwitch = useCallback((pillar: PillarKey, clickOrigin: Point) => {
    setOrigin(clickOrigin);
    setSelected(pillar);
  }, []);

  const handleAllItemsShown = useCallback(() => {
    setSelected((current) => {
      if (!current) return PILLARS[0];
      const idx = PILLARS.indexOf(current);
      const next = PILLARS[(idx + 1) % PILLARS.length];
      const stackEl = stackRef.current;
      if (stackEl) {
        const rect = stackEl.getBoundingClientRect();
        setOrigin({ x: rect.left + 28, y: rect.top + 28 });
      } else {
        setOrigin({ x: 80, y: compact ? 160 : 48 });
      }
      return next;
    });
  }, [compact]);

  useEffect(() => {
    if (compact || selected) return;

    const timer = setTimeout(() => {
      setOrigin({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setSelected(PILLARS[0]);
    }, IDLE_AUTO_START_MS);

    return () => clearTimeout(timer);
  }, [compact, selected]);

  const showContent = !!selected;
  const autoRotate = compact || showContent;

  useScreenWakeLock(autoRotate);
  useSessionKeepAlive(autoRotate);

  return (
    <ThemeProvider selected={selected} onSelect={setSelected}>
      <ThemeBackground selected={selected} origin={origin} backgrounds={backgrounds} />

      <LayoutGroup>
        <div
          className={`relative flex flex-col overflow-hidden ${
            compact ? "flex-1 min-h-0" : "min-h-screen"
          }`}
        >
          <AnimatePresence>
            {showLoginButton && !compact && <LoginCornerButton key="login-corner" />}
          </AnimatePresence>

          <div ref={stackRef}>
            <AnimatePresence>
              {selected && (
                <PillarStack
                  key="pillar-stack"
                  selected={selected}
                  compact={compact}
                  onSwitch={handleSwitch}
                />
              )}
            </AnimatePresence>
          </div>

          <div
            className={`flex-1 flex flex-col items-center w-full px-4 pb-8 justify-center ${
              compact ? "pl-20 sm:pl-24" : "pt-4"
            }`}
          >
            <AnimatePresence mode="wait">
              {!showContent ? (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35 }}
                  className="w-full flex flex-col items-center justify-center"
                >
                  <TriangleLetters onSelect={handleSelect} />
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`w-full ${compact ? "" : "pt-28 sm:pt-32"}`}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selected}
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <AmbitPanel
                        pillar={selected}
                        compact={compact}
                        onAllItemsShown={autoRotate ? handleAllItemsShown : undefined}
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {showLoginButton && !showContent && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="mt-10"
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/90 backdrop-blur-sm text-white font-medium hover:bg-slate-700 transition-colors shadow-lg"
                >
                  Área do funcionário →
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </LayoutGroup>
    </ThemeProvider>
  );
}
