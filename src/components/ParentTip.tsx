import { Lightbulb } from "lucide-react";
import { WEEKLY_LIMIT_SECONDS } from "../constants";
import { getParentTip, getUsageTone } from "../utils/usage";

type ParentTipProps = {
  readonly remainingSeconds: number;
  readonly limitSeconds?: number;
};

export function ParentTip({ remainingSeconds, limitSeconds = WEEKLY_LIMIT_SECONDS }: ParentTipProps) {
  const tone = getUsageTone(Math.max(0, limitSeconds - remainingSeconds), limitSeconds);

  return (
    <aside className={`parent-tip parent-tip--${tone}`}>
      <Lightbulb aria-hidden="true" size={20} />
      <p>{getParentTip(remainingSeconds)}</p>
    </aside>
  );
}
