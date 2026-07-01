import type {
  ActiveTimer,
  ChildId,
  DeviceType,
  LearningTaskCompletion,
  LearningTaskId,
  ManualKind,
  TimerStatus,
  UsageRecord,
} from "../types";

const childIds = new Set<string>(["xsh", "xmq"]);
const deviceTypes = new Set<string>(["电视", "手机", "平板", "电脑", "游戏机", "其他"]);
const timerStatuses = new Set<string>(["running", "paused"]);
const manualKinds = new Set<string>(["add", "subtract"]);
const learningTaskIds = new Set<string>([
  "chinese-comprehension",
  "chinese-words",
  "chinese-reading",
  "english-words",
  "english-comprehension",
  "math-calculation",
  "olympiad-math",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isChildId(value: unknown): value is ChildId {
  return isString(value) && childIds.has(value);
}

export function isDeviceType(value: unknown): value is DeviceType {
  return isString(value) && deviceTypes.has(value);
}

function isTimerStatus(value: unknown): value is TimerStatus {
  return isString(value) && timerStatuses.has(value);
}

function isManualKind(value: unknown): value is ManualKind {
  return isString(value) && manualKinds.has(value);
}

function isLearningTaskId(value: unknown): value is LearningTaskId {
  return isString(value) && learningTaskIds.has(value);
}

function isIsoLikeDate(value: unknown): value is string {
  return isString(value) && Number.isFinite(new Date(value).getTime());
}

export function isUsageRecord(value: unknown): value is UsageRecord {
  if (!isObject(value)) {
    return false;
  }

  if (
    !isString(value.id) ||
    !isChildId(value.childId) ||
    !isString(value.weekKey) ||
    !isDeviceType(value.deviceType) ||
    !isIsoLikeDate(value.startTime) ||
    !isIsoLikeDate(value.endTime) ||
    !isFiniteNumber(value.durationSeconds) ||
    !isBoolean(value.isManual)
  ) {
    return false;
  }

  if (value.manualKind !== undefined && !isManualKind(value.manualKind)) {
    return false;
  }

  if (value.note !== undefined && !isString(value.note)) {
    return false;
  }

  return true;
}

export function isActiveTimer(value: unknown): value is ActiveTimer {
  if (!isObject(value)) {
    return false;
  }

  if (
    !isString(value.id) ||
    !isChildId(value.childId) ||
    !isString(value.weekKey) ||
    !isDeviceType(value.deviceType) ||
    !isIsoLikeDate(value.startTime) ||
    !isFiniteNumber(value.pausedSeconds) ||
    !isTimerStatus(value.status)
  ) {
    return false;
  }

  if (value.pausedAt !== undefined && !isIsoLikeDate(value.pausedAt)) {
    return false;
  }

  return true;
}

export function parseRecords(value: unknown, weekKey: string): UsageRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isUsageRecord).filter((record) => record.weekKey === weekKey);
}

export function isLearningTaskCompletion(value: unknown): value is LearningTaskCompletion {
  if (!isObject(value)) {
    return false;
  }

  return (
    (value.id === undefined || isString(value.id)) &&
    isLearningTaskId(value.taskId) &&
    isChildId(value.childId) &&
    isString(value.weekKey) &&
    (value.dateKey === undefined || isString(value.dateKey)) &&
    isIsoLikeDate(value.completedAt)
  );
}

function normalizeLearningTaskCompletion(value: LearningTaskCompletion): LearningTaskCompletion {
  const dateKey = value.dateKey ?? value.completedAt.slice(0, 10);
  const id = value.id ?? `${value.childId}:${value.taskId}:${dateKey}`;

  return {
    id,
    taskId: value.taskId,
    childId: value.childId,
    weekKey: value.weekKey,
    dateKey,
    completedAt: value.completedAt,
  };
}

export function parseLearningTaskCompletions(
  value: unknown,
  weekKey: string,
): LearningTaskCompletion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isLearningTaskCompletion)
    .map(normalizeLearningTaskCompletion)
    .filter((completion) => completion.weekKey === weekKey);
}

export function parseActiveTimer(value: unknown): ActiveTimer | null {
  return isActiveTimer(value) ? value : null;
}
