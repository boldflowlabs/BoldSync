/**
 * Single source of truth for the color-theme catalog.
 */

export const THEME_IDS = ["light", "dark"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "light";

export const STORAGE_KEY = "boldsync.theme";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  swatch: string;
}

export const THEMES: ReadonlyArray<ThemeMeta> = [
  {
    id: "light",
    name: "Light",
    tagline: "Clean, professional white theme.",
    swatch: "oklch(1 0 0)",
  },
  {
    id: "dark",
    name: "Dark",
    tagline: "Sleek, easy on the eyes dark theme.",
    swatch: "oklch(0.141 0.005 285.823)",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as ReadonlyArray<string>).includes(value)
  );
}
