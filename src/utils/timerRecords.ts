import type { ChildId, DeviceType, ManualKind, UsageRecord } from "../types";
import { createId } from "./time";

export type ManualRecordInput = {
  readonly childId: ChildId;
  readonly weekKey: string;
  readonly deviceType: DeviceType;
  readonly minutes: number;
  readonly kind: ManualKind;
  readonly note?: string;
};

export type ManualRecordResult =
  | { readonly kind: "created"; readonly capped: boolean; readonly record: UsageRecord }
  | { readonly kind: "ignored"; readonly reason: "empty" | "quota-used" | "nothing-to-subtract" };

type ManualRecordCreationInput = {
  readonly input: ManualRecordInput;
  readonly usedSeconds: number;
  readonly weeklyLimitSeconds: number;
};

export function createManualRecord({
  input,
  usedSeconds,
  weeklyLimitSeconds,
}: ManualRecordCreationInput): ManualRecordResult {
  const requestedSeconds = Math.max(0, Math.round(input.minutes * 60));

  if (requestedSeconds <= 0) {
    return { kind: "ignored", reason: "empty" };
  }

  const isSubtract = input.kind === "subtract";
  const availableSeconds = Math.max(0, weeklyLimitSeconds - usedSeconds);

  if (!isSubtract && availableSeconds <= 0) {
    return { kind: "ignored", reason: "quota-used" };
  }

  if (isSubtract && usedSeconds <= 0) {
    return { kind: "ignored", reason: "nothing-to-subtract" };
  }

  const acceptedSeconds = isSubtract
    ? Math.min(requestedSeconds, usedSeconds)
    : Math.min(requestedSeconds, availableSeconds);
  const now = new Date();
  const start = new Date(now.getTime() - acceptedSeconds * 1000);
  const trimmedNote = input.note?.trim();
  const record: UsageRecord = {
    id: createId(),
    childId: input.childId,
    weekKey: input.weekKey,
    deviceType: input.deviceType,
    startTime: start.toISOString(),
    endTime: now.toISOString(),
    durationSeconds: isSubtract ? -acceptedSeconds : acceptedSeconds,
    isManual: true,
    manualKind: input.kind,
    ...(trimmedNote ? { note: trimmedNote } : {}),
  };

  return {
    kind: "created",
    capped: acceptedSeconds < requestedSeconds,
    record,
  };
}
