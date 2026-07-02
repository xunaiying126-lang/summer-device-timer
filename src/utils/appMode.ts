import type { AppMode } from "../types";

export function getAppModeFromLocation(location: Location): AppMode {
  const modeParam = new URLSearchParams(location.search).get("mode");
  if (modeParam === "parent" || modeParam === "child") {
    return modeParam;
  }

  const normalizedPath = location.pathname.replace(/\/+$/, "");
  if (normalizedPath.endsWith("/parent")) {
    return "parent";
  }

  return "child";
}

export function getAppModeHref(mode: AppMode): string {
  return `${import.meta.env.BASE_URL}${mode}/`;
}
