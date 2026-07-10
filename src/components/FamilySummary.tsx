import { Activity, BookOpenCheck, Clock3, Hourglass } from "lucide-react";
import type { ActiveTimer, Child } from "../types";
import { formatCompactDuration } from "../utils/time";

type FamilySummaryProps = {
  readonly activeTimer: ActiveTimer | null;
  readonly children: readonly Child[];
  readonly getLimitSeconds: (childId: Child["id"]) => number;
  readonly getTodayCompletedCount: (childId: Child["id"]) => number;
  readonly getUsedSeconds: (childId: Child["id"]) => number;
};

export function FamilySummary({
  activeTimer,
  children,
  getLimitSeconds,
  getTodayCompletedCount,
  getUsedSeconds,
}: FamilySummaryProps) {
  const totalUsedSeconds = children.reduce((total, child) => total + getUsedSeconds(child.id), 0);
  const totalLimitSeconds = children.reduce((total, child) => total + getLimitSeconds(child.id), 0);
  const totalRemainingSeconds = Math.max(0, totalLimitSeconds - totalUsedSeconds);
  const todayCompletedCount = children.reduce((total, child) => total + getTodayCompletedCount(child.id), 0);
  const activeChild = activeTimer ? children.find((child) => child.id === activeTimer.childId) : null;

  return (
    <section className="family-summary" id="family-overview" aria-label="家庭本周总览">
      <div className="family-summary__heading">
        <h2>家庭总览</h2>
        <span>两个孩子的本周额度与今日学习进度</span>
      </div>
      <div className="family-summary__grid">
        <div className="family-summary__item">
          <Activity aria-hidden="true" size={20} />
          <span>本周总使用</span>
          <strong>{formatCompactDuration(totalUsedSeconds)}</strong>
        </div>
        <div className="family-summary__item">
          <Hourglass aria-hidden="true" size={20} />
          <span>本周总剩余</span>
          <strong>{formatCompactDuration(totalRemainingSeconds)}</strong>
        </div>
        <div className="family-summary__item">
          <BookOpenCheck aria-hidden="true" size={20} />
          <span>今日学习打卡</span>
          <strong>{todayCompletedCount} 项</strong>
        </div>
        <div className="family-summary__item">
          <Clock3 aria-hidden="true" size={20} />
          <span>当前计时</span>
          <strong>{activeTimer ? `${activeChild?.name ?? "孩子"} · ${activeTimer.deviceType}` : "当前无计时"}</strong>
        </div>
      </div>
    </section>
  );
}
