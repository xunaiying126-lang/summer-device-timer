import type { ActiveTimer, UsageRecord, WeekInfo } from "../types";

const SECOND = 1000;
const MINUTE_SECONDS = 60;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getMonday(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return startOfLocalDay(addDays(date, offset));
}

function getIsoWeek(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return { year: target.getUTCFullYear(), week };
}

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  return Math.ceil((date.getDate() + firstDayIndex) / 7);
}

export function getWeekInfo(date = new Date()): WeekInfo {
  const start = getMonday(date);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);

  const iso = getIsoWeek(date);
  const weekKey = `${iso.year}-W${pad(iso.week)}`;
  const label = `${date.getFullYear()}年${date.getMonth() + 1}月第${getWeekOfMonth(date)}周`;
  const rangeLabel = `${start.getMonth() + 1}.${start.getDate()} - ${end.getMonth() + 1}.${end.getDate()}`;

  return { weekKey, label, rangeLabel, start, end };
}

export function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

export function formatDurationText(seconds: number): string {
  const isNegative = seconds < 0;
  const absoluteSeconds = Math.abs(seconds);
  const roundedMinutes = absoluteSeconds === 0 ? 0 : Math.ceil(absoluteSeconds / MINUTE_SECONDS);
  const sign = isNegative ? "-" : "";

  if (roundedMinutes < 60) {
    return `${sign}${roundedMinutes} 分钟`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  return minutes === 0 ? `${sign}${hours}小时` : `${sign}${hours}小时${minutes}分钟`;
}

export function formatCompactDuration(seconds: number): string {
  return formatDurationText(seconds).replace(/\s/g, "");
}

export function formatDateLabel(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatTimeLabel(value: string): string {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getActiveElapsedSeconds(timer: ActiveTimer, now = Date.now()): number {
  const startMs = new Date(timer.startTime).getTime();
  const endMs = timer.status === "paused" && timer.pausedAt ? new Date(timer.pausedAt).getTime() : now;
  const rawSeconds = Math.floor((endMs - startMs) / SECOND) - timer.pausedSeconds;

  return Math.max(0, rawSeconds);
}

export function sumRecordSeconds(records: UsageRecord[]): number {
  return Math.max(
    0,
    records.reduce((total, record) => total + record.durationSeconds, 0),
  );
}

export function sortRecords(records: UsageRecord[]): UsageRecord[] {
  return [...records].sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
