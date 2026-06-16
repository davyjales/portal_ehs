"use client";

import { createContext, useContext, type ReactNode } from "react";
import { type PillarKey } from "@/lib/ehs";

type ThemeContextValue = {
  selected: PillarKey | null;
  setSelected: (pillar: PillarKey | null) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  selected: null,
  setSelected: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({
  children,
  selected,
  onSelect,
}: {
  children: ReactNode;
  selected: PillarKey | null;
  onSelect: (pillar: PillarKey | null) => void;
}) {
  return (
    <ThemeContext.Provider value={{ selected, setSelected: onSelect }}>
      {children}
    </ThemeContext.Provider>
  );
}
