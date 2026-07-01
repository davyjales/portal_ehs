"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  PILLAR_CONFIG,
  buildEHSMedia,
  INFO_ROTATE_MS,
  type EHSMediaItem,
  type PillarKey,
} from "@/lib/ehs";
import { truncateSummary } from "@/lib/quiz";

const SWIPE_THRESHOLD = 50;
const AUTO_ROTATE_PAUSE_MS = 8000;

type EHSItem = {
  id: string;
  title: string;
  summary?: string;
  body: string;
  order: number;
  images?: string;
  videos?: string;
  coverIndex?: number;
};

function displaySummary(item: EHSItem): string {
  return truncateSummary(item.body);
}

function hasExpandableContent(item: EHSItem): boolean {
  const summary = displaySummary(item);
  return item.body.trim().length > summary.length;
}

function InfoTextContent({
  item,
  pillar,
  expanded,
  onToggleExpand,
  isLightTheme,
}: {
  item: EHSItem;
  pillar: PillarKey;
  expanded: boolean;
  onToggleExpand: () => void;
  isLightTheme: boolean;
}) {
  const config = PILLAR_CONFIG[pillar];
  const summary = displaySummary(item);
  const canExpand = hasExpandableContent(item);
  const textMuted = isLightTheme ? "#475569" : "rgba(255,255,255,0.85)";
  const textTitle = isLightTheme ? "#1e293b" : "#ffffff";

  return (
    <>
      <h3 className="font-semibold mb-2" style={{ color: textTitle }}>
        {item.title}
      </h3>
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: textMuted }}>
        {summary}
      </p>
      {canExpand && (
        <>
          <button
            type="button"
            onClick={onToggleExpand}
            className="mt-3 text-sm font-medium underline underline-offset-2"
            style={{ color: config.accentLight }}
          >
            {expanded ? "Ver menos" : "Saiba mais"}
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div
                  className="mt-3 pt-3 border-t text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    color: textMuted,
                    borderColor: isLightTheme ? "rgba(22,163,74,0.2)" : "rgba(255,255,255,0.2)",
                  }}
                >
                  {item.body}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

function MediaSlide({
  media,
  title,
  active,
}: {
  media: EHSMediaItem;
  title: string;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.type !== "video") return;

    if (active) {
      video.currentTime = 0;
      void video.play().catch(() => {
        /* autoplay may be blocked until user interaction */
      });
    } else {
      video.pause();
    }
  }, [active, media]);

  if (media.type === "video") {
    return (
      <video
        ref={videoRef}
        src={media.src}
        className="w-full h-full object-cover"
        playsInline
        muted
        loop
        controls
        preload="metadata"
        aria-label={title}
      />
    );
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={media.src}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 384px"
      />
    </div>
  );
}

function InstagramPost({
  item,
  pillar,
  expanded,
  onToggleExpand,
}: {
  item: EHSItem;
  pillar: PillarKey;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const config = PILLAR_CONFIG[pillar];
  const media = buildEHSMedia(item.images, item.videos, item.coverIndex);
  const [mediaIndex, setMediaIndex] = useState(0);

  useEffect(() => {
    setMediaIndex(0);
  }, [item.id]);

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200/80 max-w-sm mx-auto">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {config.letter}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{config.label}</p>
          <p className="text-[11px] text-slate-500 truncate">Portal EHS</p>
        </div>
      </div>

      {media.length > 0 && (
        <div className="relative aspect-square bg-slate-100">
          <MediaSlide media={media[mediaIndex]} title={item.title} active={true} />
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setMediaIndex((i) => (i - 1 + media.length) % media.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white text-xs hover:bg-black/55 z-10"
                aria-label="Mídia anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setMediaIndex((i) => (i + 1) % media.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white text-xs hover:bg-black/55 z-10"
                aria-label="Próxima mídia"
              >
                ›
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
                {media.map((m, i) => (
                  <span
                    key={`${m.type}-${m.src}`}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === mediaIndex ? "bg-white scale-125" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="px-3 py-3 space-y-1.5">
        <p className="text-sm">
          <span className="font-semibold text-slate-900 mr-1.5">{config.label}</span>
        </p>
        <InfoTextContent
          item={item}
          pillar={pillar}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          isLightTheme
        />
      </div>
    </div>
  );
}

export function AmbitPanel({
  pillar,
  compact = false,
  onAllItemsShown,
}: {
  pillar: PillarKey | null;
  compact?: boolean;
  onAllItemsShown?: () => void;
}) {
  const [items, setItems] = useState<EHSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseAutoRotate = useCallback(() => {
    setAutoRotateEnabled(false);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setAutoRotateEnabled(true);
    }, AUTO_ROTATE_PAUSE_MS);
  }, []);

  const goTo = useCallback(
    (nextIndex: number) => {
      pauseAutoRotate();
      setExpanded(false);
      setIndex(nextIndex);
    },
    [pauseAutoRotate]
  );

  const goNext = useCallback(() => {
    if (items.length === 0) return;
    if (index >= items.length - 1) {
      onAllItemsShown?.();
      return;
    }
    goTo(index + 1);
  }, [index, items.length, goTo, onAllItemsShown]);

  const goPrev = useCallback(() => {
    if (items.length === 0 || index <= 0) return;
    goTo(index - 1);
  }, [index, items.length, goTo]);

  useEffect(() => {
    if (!pillar) {
      setItems([]);
      setIndex(0);
      setExpanded(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ehs?pillar=${pillar}`)
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível carregar os informativos.");
        return res.json();
      })
      .then((data: EHSItem[]) => {
        if (!cancelled) {
          setItems(data);
          setIndex(0);
          setExpanded(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pillar]);

  useEffect(() => {
    if (loading || !pillar || !autoRotateEnabled) return;

    if (items.length === 0) {
      if (onAllItemsShown) {
        const timer = setTimeout(onAllItemsShown, INFO_ROTATE_MS);
        return () => clearTimeout(timer);
      }
      return;
    }

    const timer = setInterval(() => {
      setIndex((i) => {
        if (i >= items.length - 1) {
          onAllItemsShown?.();
          return i;
        }
        setExpanded(false);
        return i + 1;
      });
    }, INFO_ROTATE_MS);

    return () => clearInterval(timer);
  }, [items, loading, pillar, onAllItemsShown, autoRotateEnabled]);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const current = useMemo(() => items[index], [items, index]);

  if (!pillar) return null;

  const config = PILLAR_CONFIG[pillar];
  const isLightTheme = pillar === "HEALTH";
  const hasMedia = current ? buildEHSMedia(current.images, current.videos, current.coverIndex).length > 0 : false;
  const showNav = items.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className={`w-full max-w-2xl mx-auto px-4 ${compact ? "" : "mt-4"}`}
    >
      {loading && (
        <p
          className="animate-pulse text-sm text-center"
          style={{ color: isLightTheme ? "#64748b" : "rgba(255,255,255,0.7)" }}
        >
          Carregando informativos...
        </p>
      )}

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p
          className="text-sm text-center"
          style={{ color: isLightTheme ? "#64748b" : "rgba(255,255,255,0.7)" }}
        >
          Nenhum informativo disponível para este âmbito.
        </p>
      )}

      {!loading && !error && current && (
        <div className={`relative flex items-center gap-2 ${showNav ? "" : "justify-center"}`}>
          {showNav && (
            <button
              type="button"
              onClick={goPrev}
              disabled={index === 0}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg disabled:opacity-30 transition-opacity"
              style={{
                backgroundColor: isLightTheme ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)",
                color: isLightTheme ? config.color : "#ffffff",
              }}
              aria-label="Informativo anterior"
            >
              ‹
            </button>
          )}

          <div className="flex-1 min-w-0 touch-pan-y">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                drag={showNav ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  if (info.offset.x <= -SWIPE_THRESHOLD) goNext();
                  else if (info.offset.x >= SWIPE_THRESHOLD) goPrev();
                }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="cursor-grab active:cursor-grabbing"
              >
                {hasMedia ? (
                  <InstagramPost
                    item={current}
                    pillar={pillar}
                    expanded={expanded}
                    onToggleExpand={() => {
                      pauseAutoRotate();
                      setExpanded((v) => !v);
                    }}
                  />
                ) : (
                  <div
                    className="rounded-2xl shadow-xl border p-6 min-h-[180px] backdrop-blur-md"
                    style={{
                      backgroundColor: isLightTheme ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.12)",
                      borderColor: isLightTheme ? "rgba(22,163,74,0.25)" : "rgba(255,255,255,0.25)",
                    }}
                  >
                    <h2
                      className="text-lg font-semibold mb-4 tracking-wide"
                      style={{ color: isLightTheme ? config.color : config.textOnTheme }}
                    >
                      {config.label}
                    </h2>
                    <InfoTextContent
                      item={current}
                      pillar={pillar}
                      expanded={expanded}
                      onToggleExpand={() => {
                        pauseAutoRotate();
                        setExpanded((v) => !v);
                      }}
                      isLightTheme={isLightTheme}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {showNav && (
            <button
              type="button"
              onClick={goNext}
              disabled={index >= items.length - 1}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg disabled:opacity-30 transition-opacity"
              style={{
                backgroundColor: isLightTheme ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)",
                color: isLightTheme ? config.color : "#ffffff",
              }}
              aria-label="Próximo informativo"
            >
              ›
            </button>
          )}
        </div>
      )}

      {!loading && !error && showNav && (
        <div className="flex justify-center gap-1.5 mt-4">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor:
                  i === index
                    ? config.accentLight
                    : isLightTheme
                      ? "#cbd5e1"
                      : "rgba(255,255,255,0.35)",
                transform: i === index ? "scale(1.3)" : "scale(1)",
              }}
              aria-label={`Informativo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
