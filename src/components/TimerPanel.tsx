import { Pause, Play, Plus, RotateCcw, Square } from "lucide-react";
import type { ActiveTimer, Child, DeviceType } from "../types";
import { formatClock, formatCompactDuration } from "../utils/time";
import { ProgressBar } from "./ProgressBar";
import { DeviceSelector } from "./DeviceSelector";
import { ParentTip } from "./ParentTip";

type TimerPanelProps = {
  readonly activeElapsedSeconds: number;
  readonly activeTimer: ActiveTimer | null;
  readonly selectedChild: Child;
  readonly selectedDevice: DeviceType;
  readonly weeklyLimitSeconds: number;
  readonly usedSeconds: number;
  readonly onDeviceChange: (deviceType: DeviceType) => void;
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onEnd: () => void;
  readonly onOpenManual: () => void;
  readonly onReset: () => void;
};

export function TimerPanel({
  activeElapsedSeconds,
  activeTimer,
  selectedChild,
  selectedDevice,
  weeklyLimitSeconds,
  usedSeconds,
  onDeviceChange,
  onStart,
  onPause,
  onResume,
  onEnd,
  onOpenManual,
  onReset,
}: TimerPanelProps) {
  const remainingSeconds = Math.max(0, weeklyLimitSeconds - usedSeconds);
  const isQuotaDone = remainingSeconds <= 0;
  const isSelectedTimer = activeTimer?.childId === selectedChild.id;
  const hasOtherTimer = Boolean(activeTimer && !isSelectedTimer);
  const canStart = !activeTimer && !isQuotaDone;
  const timerDevice = isSelectedTimer && activeTimer ? activeTimer.deviceType : selectedDevice;
  const timerValue = isSelectedTimer ? activeElapsedSeconds : 0;

  return (
    <section className="timer-panel" aria-label={`正在管理：${selectedChild.name}`}>
      <div className="timer-panel__main">
        <div className="section-label">正在管理：{selectedChild.name}</div>
        <div className="timer-display" aria-live="polite">
          {formatClock(timerValue)}
        </div>
        <div className="timer-stats">
          <span>当前设备：{timerDevice}</span>
          <span>本周已用：{formatCompactDuration(usedSeconds)}</span>
          <span>剩余：{formatCompactDuration(remainingSeconds)}</span>
        </div>
        <ProgressBar usedSeconds={usedSeconds} limitSeconds={weeklyLimitSeconds} />

        {isQuotaDone ? <div className="quota-alert">本周电子产品时间已用完</div> : null}
        {hasOtherTimer ? <div className="quota-alert quota-alert--soft">另一个孩子正在计时中</div> : null}

        <div className="timer-actions">
          {!isSelectedTimer ? (
            <button className="button button--primary" type="button" disabled={!canStart} onClick={onStart}>
              <Play aria-hidden="true" size={20} />
              开始计时
            </button>
          ) : null}

          {isSelectedTimer && activeTimer?.status === "running" ? (
            <>
              <button className="button button--warning" type="button" onClick={onPause}>
                <Pause aria-hidden="true" size={20} />
                暂停
              </button>
              <button className="button button--secondary" type="button" onClick={onEnd}>
                <Square aria-hidden="true" size={19} />
                结束本次
              </button>
            </>
          ) : null}

          {isSelectedTimer && activeTimer?.status === "paused" ? (
            <>
              <button className="button button--primary" type="button" onClick={onResume}>
                <Play aria-hidden="true" size={20} />
                继续
              </button>
              <button className="button button--secondary" type="button" onClick={onEnd}>
                <Square aria-hidden="true" size={19} />
                结束本次
              </button>
            </>
          ) : null}
        </div>

        <div className="parent-actions">
          <button className="button button--ghost" type="button" onClick={onOpenManual}>
            <Plus aria-hidden="true" size={18} />
            补录时间
          </button>
          <button className="button button--danger-ghost" type="button" onClick={onReset}>
            <RotateCcw aria-hidden="true" size={18} />
            重置本周
          </button>
        </div>
      </div>

      <div className="timer-panel__side">
        <div>
          <h2>选择当前使用的设备</h2>
          <DeviceSelector
            selectedDevice={selectedDevice}
            disabled={Boolean(activeTimer)}
            onChange={onDeviceChange}
          />
        </div>
        <ParentTip remainingSeconds={remainingSeconds} limitSeconds={weeklyLimitSeconds} />
      </div>
    </section>
  );
}
