import type { Child } from "../types";
import { formatCompactDuration } from "../utils/time";
import { ProgressBar } from "./ProgressBar";

type WeeklyOverviewProps = {
  readonly children: readonly Child[];
  readonly getLimitSeconds: (childId: Child["id"]) => number;
  readonly getUsedSeconds: (childId: Child["id"]) => number;
};

export function WeeklyOverview({ children, getLimitSeconds, getUsedSeconds }: WeeklyOverviewProps) {
  return (
    <section className="overview-panel">
      <div className="panel-heading">
        <h2>一周总览</h2>
        <span>单位：分钟</span>
      </div>

      <div className="overview-list">
        {children.map((child) => {
          const usedSeconds = getUsedSeconds(child.id);
          const limitSeconds = getLimitSeconds(child.id);

          return (
            <div className="overview-row" key={child.id}>
              <div className="overview-row__label">
                <strong>{child.name}</strong>
                <span>
                  {formatCompactDuration(usedSeconds)} / {formatCompactDuration(limitSeconds)}
                </span>
              </div>
              <ProgressBar usedSeconds={usedSeconds} limitSeconds={limitSeconds} compact />
            </div>
          );
        })}
      </div>
    </section>
  );
}
