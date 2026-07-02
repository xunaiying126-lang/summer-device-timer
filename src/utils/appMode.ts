import type { AppView, ChildId } from "../types";

const childPathById: Record<ChildId, string> = {
  xsh: "xushihan",
  xmq: "xumuqiu",
};

const childIdByPath: Record<string, ChildId> = {
  xushihan: "xsh",
  xumuqiu: "xmq",
};

export function getAppViewFromLocation(location: Location): AppView {
  const modeParam = new URLSearchParams(location.search).get("mode");
  const childParam = new URLSearchParams(location.search).get("child");
  if (modeParam === "parent") {
    return { mode: "parent", childId: null };
  }

  if (childParam === "xsh" || childParam === "xmq") {
    return { mode: "child", childId: childParam };
  }

  const normalizedPath = location.pathname.replace(/\/+$/, "");
  if (normalizedPath.endsWith("/parent")) {
    return { mode: "parent", childId: null };
  }

  const pathParts = normalizedPath.split("/");
  const pathSegment = pathParts[pathParts.length - 1] ?? "";
  const childId = childIdByPath[pathSegment];
  if (childId) {
    return { mode: "child", childId };
  }

  return { mode: "parent", childId: null };
}

export function getChildEntryPath(childId: ChildId): string {
  return childPathById[childId];
}
