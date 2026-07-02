import type { ActiveTimer, ActiveTimersByChild, ChildId, LearningTaskCompletion, UsageRecord } from "../types";
import { parseActiveTimer, parseLearningTaskCompletions, parseRecords } from "../utils/guards";
import { sortRecords } from "../utils/time";
import {
  familyDocumentUrl,
  fetchJson,
  getPayload,
  isCloudConfigured,
  subscribePoll,
} from "./firestoreRest";

export { isCloudConfigured } from "./firestoreRest";

function recordsDocUrl(weekKey: string): string {
  return familyDocumentUrl(["weeks", weekKey, "state", "records"]);
}

function activeTimerDocUrl(): string {
  return familyDocumentUrl(["state", "activeTimer"]);
}

function learningDocUrl(weekKey: string): string {
  return familyDocumentUrl(["weeks", weekKey, "state", "learning"]);
}

async function loadCloudRecords(weekKey: string): Promise<UsageRecord[]> {
  const document = await fetchJson(recordsDocUrl(weekKey));
  const payload = getPayload(document);

  if (!payload) {
    return [];
  }

  const parsed: unknown = JSON.parse(payload);
  return sortRecords(parseRecords(parsed, weekKey));
}

async function writeCloudRecords(weekKey: string, records: readonly UsageRecord[]): Promise<void> {
  await fetchJson(recordsDocUrl(weekKey), {
    method: "PATCH",
    body: JSON.stringify({
      fields: {
        payload: { stringValue: JSON.stringify(sortRecords([...records])) },
        updatedAtMs: { integerValue: String(Date.now()) },
      },
    }),
  });
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseActiveTimersPayload(value: unknown): ActiveTimersByChild {
  const legacyTimer = parseActiveTimer(value);
  if (legacyTimer) {
    return {
      xsh: legacyTimer.childId === "xsh" ? legacyTimer : null,
      xmq: legacyTimer.childId === "xmq" ? legacyTimer : null,
    };
  }

  if (!isRecordValue(value)) {
    return { xsh: null, xmq: null };
  }

  const xshTimer = parseActiveTimer(value.xsh);
  const xmqTimer = parseActiveTimer(value.xmq);
  return {
    xsh: xshTimer?.childId === "xsh" ? xshTimer : null,
    xmq: xmqTimer?.childId === "xmq" ? xmqTimer : null,
  };
}

async function loadCloudActiveTimers(): Promise<ActiveTimersByChild> {
  const document = await fetchJson(activeTimerDocUrl());
  const payload = getPayload(document);

  if (!payload) {
    return { xsh: null, xmq: null };
  }

  const parsed: unknown = JSON.parse(payload);
  return parseActiveTimersPayload(parsed);
}

async function loadCloudLearningTaskCompletions(weekKey: string): Promise<LearningTaskCompletion[]> {
  const document = await fetchJson(learningDocUrl(weekKey));
  const payload = getPayload(document);

  if (!payload) {
    return [];
  }

  const parsed: unknown = JSON.parse(payload);
  return parseLearningTaskCompletions(parsed, weekKey);
}

async function writeCloudLearningTaskCompletions(
  weekKey: string,
  completions: readonly LearningTaskCompletion[],
): Promise<void> {
  await fetchJson(learningDocUrl(weekKey), {
    method: "PATCH",
    body: JSON.stringify({
      fields: {
        payload: { stringValue: JSON.stringify(completions) },
        updatedAtMs: { integerValue: String(Date.now()) },
      },
    }),
  });
}

export function subscribeCloudRecords(
  weekKey: string,
  onChange: (records: UsageRecord[]) => void,
  onError: (error: Error) => void,
): () => void {
  if (!isCloudConfigured()) {
    return () => undefined;
  }

  return subscribePoll(
    () => loadCloudRecords(weekKey),
    (records) => JSON.stringify(records),
    onChange,
    onError,
  );
}

export function subscribeCloudActiveTimers(
  onChange: (timers: ActiveTimersByChild) => void,
  onError: (error: Error) => void,
): () => void {
  if (!isCloudConfigured()) {
    return () => undefined;
  }

  return subscribePoll(loadCloudActiveTimers, (timers) => JSON.stringify(timers), onChange, onError);
}

export function subscribeCloudLearningTaskCompletions(
  weekKey: string,
  onChange: (completions: LearningTaskCompletion[]) => void,
  onError: (error: Error) => void,
): () => void {
  if (!isCloudConfigured()) {
    return () => undefined;
  }

  return subscribePoll(
    () => loadCloudLearningTaskCompletions(weekKey),
    (completions) => JSON.stringify(completions),
    onChange,
    onError,
  );
}

export async function upsertCloudRecord(record: UsageRecord): Promise<void> {
  if (!isCloudConfigured()) {
    return;
  }

  const records = await loadCloudRecords(record.weekKey);
  const nextRecords = sortRecords([...records.filter((item) => item.id !== record.id), record]);
  await writeCloudRecords(record.weekKey, nextRecords);
}

export async function deleteCloudRecord(weekKey: string, recordId: string): Promise<void> {
  if (!isCloudConfigured()) {
    return;
  }

  const records = await loadCloudRecords(weekKey);
  await writeCloudRecords(
    weekKey,
    records.filter((record) => record.id !== recordId),
  );
}

export async function clearCloudChildRecords(childId: ChildId, weekKey: string): Promise<void> {
  if (!isCloudConfigured()) {
    return;
  }

  const records = await loadCloudRecords(weekKey);
  await writeCloudRecords(
    weekKey,
    records.filter((record) => record.childId !== childId),
  );
}

export async function saveCloudActiveTimer(childId: ChildId, timer: ActiveTimer | null): Promise<void> {
  if (!isCloudConfigured()) {
    return;
  }

  const currentTimers = await loadCloudActiveTimers();
  const nextTimers: ActiveTimersByChild = { ...currentTimers, [childId]: timer };

  await fetchJson(activeTimerDocUrl(), {
    method: "PATCH",
    body: JSON.stringify({
      fields: {
        payload: { stringValue: JSON.stringify(nextTimers) },
        updatedAtMs: { integerValue: String(Date.now()) },
      },
    }),
  });
}

export async function saveCloudLearningTaskCompletions(
  weekKey: string,
  completions: readonly LearningTaskCompletion[],
): Promise<void> {
  if (!isCloudConfigured()) {
    return;
  }

  await writeCloudLearningTaskCompletions(weekKey, completions);
}
