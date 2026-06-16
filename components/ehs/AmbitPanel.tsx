"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  PILLAR_CONFIG,
  parseEHSImages,
  INFO_ROTATE_MS,
  type PillarKey,
} from "@/lib/ehs";

type EHSItem = {
  id: string;
  title: string;
  body: string;
  order: number;
  images?: string;
  coverIndex?: number;
};

function orderedImages(item: EHSItem): string[] {
  const images = parseEHSImages(item.images);
  if (images.length <= 1) return images;
  const cover = Math.max(0, Math.min(item.coverIndex ?? 0, images.length - 1));
  if (cover === 0) return images;
  return [images[cover], ...images.filter((_, i) => i !== cover)];
}

function InstagramPost({
  item,
  pillar,
}: {
  item: EHSItem;
  pillar: PillarKey;
}) {
  const config = PILLAR_CONFIG[pillar];
  const images = orderedImages(item);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    setImgIndex(0);
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

      {images.length > 0 && (
        <div className="relative aspect-square bg-slate-100">
          <Image
            src={images[imgIndex]}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 384px"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white text-xs hover:bg-black/55"
                aria-label="Foto anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white text-xs hover:bg-black/55"
                aria-label="Próxima foto"
              >
                ›
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === imgIndex ? "bg-white scale-125" : "bg-white/50"
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
          <span className="font-semibold text-slate-800">{item.title}</span>
        </p>
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.body}</p>
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

  useEffect(() => {
    if (!pillar) {
      setItems([]);
      setIndex(0);
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
    if (loading || !pillar) return;

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
        return i + 1;
      });
    }, INFO_ROTATE_MS);

    return () => clearInterval(timer);
  }, [items, loading, pillar, onAllItemsShown]);

  const current = useMemo(() => items[index], [items, index]);

  if (!pillar) return null;

  const config = PILLAR_CONFIG[pillar];
  const isLightTheme = pillar === "HEALTH";
  const hasImages = current ? orderedImages(current).length > 0 : false;

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
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
          >
            {hasImages ? (
              <InstagramPost item={current} pillar={pillar} />
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
                <h3
                  className="font-semibold mb-2"
                  style={{ color: isLightTheme ? "#1e293b" : "#ffffff" }}
                >
                  {current.title}
                </h3>
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: isLightTheme ? "#475569" : "rgba(255,255,255,0.85)" }}
                >
                  {current.body}
                </p>
              </div>
            )}

            {items.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(i)}
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
        </AnimatePresence>
      )}
    </motion.div>
  );
}
