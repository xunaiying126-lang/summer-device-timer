import { getUsageRatio, getUsageTone } from "../utils/usage";

type ProgressBarProps = {
  readonly usedSeconds: number;
  readonly limitSeconds?: number;
  readonly compact?: boolean;
};

export function ProgressBar({ usedSeconds, limitSeconds, compact = false }: ProgressBarProps) {
  const ratio = getUsageRatio(usedSeconds, limitSeconds);
  const tone = getUsageTone(usedSeconds, limitSeconds);

  return (
    <div className={`progress progress--${tone} ${compact ? "progress--compact" : ""}`}>
      <div className="progress__fill" style={{ width: `${ratio}%` }} />
    </div>
  );
}
