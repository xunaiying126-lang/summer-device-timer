import { Clock3 } from "lucide-react";
import { WEEKLY_LIMIT_SECONDS } from "../constants";
import type { Child } from "../types";
import { formatCompactDuration } from "../utils/time";
import { getUsageStatusLabel, getUsageTone } from "../utils/usage";
import { ProgressBar } from "./ProgressBar";

type ChildCardProps = {
  readonly child: Child;
  readonly limitSeconds: number;
  readonly usedSeconds: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
};

export function ChildCard({ child, limitSeconds, usedSeconds, selected, onSelect }: ChildCardProps) {
  const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);
  const tone = getUsageTone(usedSeconds, limitSeconds);

  return (
    <button
      type="button"
      className={`child-card child-card--${child.avatarTone} ${selected ? "child-card--selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="child-card__avatar" aria-hidden="true">
        {child.name.slice(1, 2)}
      </span>
      <span className="child-card__content">
        <span className="child-card__topline">
          <strong>{child.name}</strong>
          <span className={`status-pill status-pill--${tone}`}>{getUsageStatusLabel(usedSeconds, limitSeconds)}</span>
        </span>
        <span className="child-card__role">{child.role}</span>
        <span className="child-card__numbers">
          <span>本周已用 {formatCompactDuration(usedSeconds)}</span>
          <span>剩余 {formatCompactDuration(remainingSeconds)}</span>
        </span>
        <ProgressBar usedSeconds={usedSeconds} limitSeconds={limitSeconds} />
        <span className="child-card__quota">
          <Clock3 aria-hidden="true" size={15} />
          {Math.ceil(usedSeconds / 60)} / {Math.ceil(limitSeconds / 60)} 分钟
        </span>
      </span>
    </button>
  );
}
