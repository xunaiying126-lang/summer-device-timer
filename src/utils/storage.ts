import type { ActiveTimer, LearningTaskCompletion, UsageRecord } from "../types";
import { parseActiveTimer, parseLearningTaskCompletions, parseRecords } from "./guards";
import { sortRecords } from "./time";

const STORAGE_PREFIX = "summer-device-timer-v1";

function safeParse(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    return null;
  }
}

function recordsKey(weekKey: string): string {
  return `${STORAGE_PREFIX}:records:${weekKey}`;
}

function learningCompletionsKey(weekKey: string): string {
  return `${STORAGE_PREFIX}:learning:${weekKey}`;
}

const activeTimerKey = `${STORAGE_PREFIX}:activeTimer`;

export function loadRecords(weekKey: string): UsageRecord[] {
  return sortRecords(parseRecords(safeParse(localStorage.getItem(recordsKey(weekKey))), weekKey));
}

export function saveRecords(weekKey: string, records: UsageRecord[]): void {
  localStorage.setItem(recordsKey(weekKey), JSON.stringify(sortRecords(records)));
}

export function loadLearningTaskCompletions(weekKey: string): LearningTaskCompletion[] {
  return parseLearningTaskCompletions(
    safeParse(localStorage.getItem(learningCompletionsKey(weekKey))),
    weekKey,
  );
}

export function saveLearningTaskCompletions(
  weekKey: string,
  completions: readonly LearningTaskCompletion[],
): void {
  localStorage.setItem(learningCompletionsKey(weekKey), JSON.stringify(completions));
}

export function loadActiveTimer(): ActiveTimer | null {
  return parseActiveTimer(safeParse(localStorage.getItem(activeTimerKey)));
}

export function saveActiveTimer(timer: ActiveTimer | null): void {
  if (!timer) {
    localStorage.removeItem(activeTimerKey);
    return;
  }

  localStorage.setItem(activeTimerKey, JSON.stringify(timer));
}
