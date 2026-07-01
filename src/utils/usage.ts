import { WEEKLY_LIMIT_SECONDS } from "../constants";

export type UsageTone = "safe" | "warning" | "danger" | "done";

export function getUsageRatio(usedSeconds: number, limitSeconds = WEEKLY_LIMIT_SECONDS): number {
  const safeLimitSeconds = Math.max(1, limitSeconds);
  return Math.min(100, Math.max(0, (usedSeconds / safeLimitSeconds) * 100));
}

export function getUsageTone(usedSeconds: number, limitSeconds = WEEKLY_LIMIT_SECONDS): UsageTone {
  const ratio = getUsageRatio(usedSeconds, limitSeconds);

  if (ratio >= 100) {
    return "done";
  }

  if (ratio >= 90) {
    return "danger";
  }

  if (ratio >= 60) {
    return "warning";
  }

  return "safe";
}

export function getUsageStatusLabel(usedSeconds: number, limitSeconds = WEEKLY_LIMIT_SECONDS): string {
  const tone = getUsageTone(usedSeconds, limitSeconds);

  switch (tone) {
    case "safe":
      return "充足";
    case "warning":
      return "快用完";
    case "danger":
      return "快用完";
    case "done":
      return "已用完";
  }
}

export function getParentTip(remainingSeconds: number): string {
  if (remainingSeconds <= 0) {
    return "本周电子产品时间已用完，可以安排阅读、运动、画画或亲子活动。";
  }

  if (remainingSeconds < 15 * 60) {
    return "本周剩余时间很少，请谨慎使用。";
  }

  if (remainingSeconds <= 45 * 60) {
    return "本周时间已经用掉不少，建议优先安排学习和户外活动。";
  }

  return "时间还充足，但也要注意保护眼睛。";
}
