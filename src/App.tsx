import { useEffect, useMemo, useRef, useState } from "react";
import { CHILDREN, CHILDREN_BY_ID, WEEKLY_LIMIT_SECONDS } from "./constants";
import { ChildCard } from "./components/ChildCard";
import { Header } from "./components/Header";
import { LearningTasksPanel } from "./components/LearningTasksPanel";
import { ManualEntryModal } from "./components/ManualEntryModal";
import { RecordsList } from "./components/RecordsList";
import { TimerPanel } from "./components/TimerPanel";
import { WeeklyOverview } from "./components/WeeklyOverview";
import { useDeviceTimer } from "./hooks/useDeviceTimer";
import { useLearningRewards } from "./hooks/useLearningRewards";
import type { ChildId, DeviceType } from "./types";
import { getWeekInfo } from "./utils/time";

const DEFAULT_CHILD_ID: ChildId = "xsh";
const DEFAULT_DEVICE: DeviceType = "电视";

export function App() {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedChildId, setSelectedChildId] = useState<ChildId>(DEFAULT_CHILD_ID);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(DEFAULT_DEVICE);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const autoStopTimerIdRef = useRef<string | null>(null);
  const weekInfo = useMemo(() => getWeekInfo(new Date(nowMs)), [nowMs]);
  const selectedChild = CHILDREN_BY_ID[selectedChildId];
  const learning = useLearningRewards(weekInfo.weekKey);
  const weeklyLimitSecondsByChild = useMemo(
    () => ({
      xsh: WEEKLY_LIMIT_SECONDS + learning.getBonusSeconds("xsh"),
      xmq: WEEKLY_LIMIT_SECONDS + learning.getBonusSeconds("xmq"),
    }),
    [learning.getBonusSeconds],
  );
  const timer = useDeviceTimer(weekInfo.weekKey, nowMs, weeklyLimitSecondsByChild);
  const selectedUsedSeconds = timer.getUsedSeconds(selectedChildId);
  const selectedLimitSeconds = timer.getWeeklyLimitSeconds(selectedChildId);
  const selectedRecords = useMemo(
    () => timer.records.filter((record) => record.childId === selectedChildId),
    [selectedChildId, timer.records],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!timer.activeTimer || timer.activeTimer.weekKey !== weekInfo.weekKey) {
      return;
    }

    if (timer.activeTimer.status !== "running") {
      return;
    }

    if (timer.getUsedSeconds(timer.activeTimer.childId) < timer.getWeeklyLimitSeconds(timer.activeTimer.childId)) {
      return;
    }

    if (autoStopTimerIdRef.current === timer.activeTimer.id) {
      return;
    }

    autoStopTimerIdRef.current = timer.activeTimer.id;
    timer.endTimer({ autoStopped: true });
    window.alert("本周额度已用完，请休息眼睛，去做别的事情吧");
  }, [timer, weekInfo.weekKey]);

  const handleStart = () => {
    const started = timer.startTimer(selectedChildId, selectedDevice);
    if (!started && selectedUsedSeconds >= selectedLimitSeconds) {
      window.alert("本周电子产品时间已用完");
    }
  };

  const handleEnd = () => {
    timer.endTimer();
  };

  const handleManualSubmit = (input: {
    readonly deviceType: DeviceType;
    readonly minutes: number;
    readonly kind: "add" | "subtract";
    readonly note?: string;
  }) => {
    const result = timer.addManualRecord({
      childId: selectedChildId,
      weekKey: weekInfo.weekKey,
      ...input,
    });

    switch (result.kind) {
      case "created":
        setManualModalOpen(false);
        if (result.capped) {
          window.alert(input.kind === "add" ? "已达到本周上限" : "已按当前已用时间修正，不能低于 0");
        }
        return;
      case "ignored":
        if (result.reason === "quota-used") {
          window.alert("本周电子产品时间已用完");
          return;
        }

        if (result.reason === "nothing-to-subtract") {
          window.alert("当前没有可减少的本周时间");
          return;
        }

        window.alert("请输入大于 0 的分钟数");
        return;
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    const confirmed = window.confirm("确定要删除这条记录吗？删除后会重新计算本周时间。");
    if (confirmed) {
      timer.deleteRecord(recordId);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm("确定要清空当前孩子本周所有记录吗？这个操作不能撤销。");
    if (confirmed) {
      timer.resetChildWeek(selectedChildId);
    }
  };

  return (
    <main className="app-shell">
      <Header weekInfo={weekInfo} syncStatus={timer.syncStatus} syncMessage={timer.syncMessage} />

      <section className="children-grid" aria-label="孩子选择">
        {CHILDREN.map((child) => (
          <ChildCard
            child={child}
            key={child.id}
            limitSeconds={timer.getWeeklyLimitSeconds(child.id)}
            selected={child.id === selectedChildId}
            usedSeconds={timer.getUsedSeconds(child.id)}
            onSelect={() => setSelectedChildId(child.id)}
          />
        ))}
      </section>

      <TimerPanel
        activeElapsedSeconds={timer.activeElapsedSeconds}
        activeTimer={timer.activeTimer}
        selectedChild={selectedChild}
        selectedDevice={selectedDevice}
        weeklyLimitSeconds={selectedLimitSeconds}
        usedSeconds={selectedUsedSeconds}
        onDeviceChange={setSelectedDevice}
        onStart={handleStart}
        onPause={timer.pauseTimer}
        onResume={timer.resumeTimer}
        onEnd={handleEnd}
        onOpenManual={() => setManualModalOpen(true)}
        onReset={handleReset}
      />

      <LearningTasksPanel
        bonusSeconds={learning.getBonusSeconds(selectedChildId)}
        child={selectedChild}
        completions={learning.getChildCompletions(selectedChildId)}
        completedCount={learning.getCompletedCount(selectedChildId)}
        isTaskCompletedToday={(taskId) => learning.isTaskCompletedToday(selectedChildId, taskId)}
        onToggleTask={(taskId) => learning.toggleTask(selectedChildId, taskId)}
        syncMessage={learning.saveMessage}
        syncStatus={learning.saveStatus}
        todayCompletedCount={learning.getTodayCompletedCount(selectedChildId)}
      />

      <section className="lower-grid">
        <RecordsList records={selectedRecords} onDelete={handleDeleteRecord} />
        <WeeklyOverview
          children={CHILDREN}
          getLimitSeconds={timer.getWeeklyLimitSeconds}
          getUsedSeconds={timer.getUsedSeconds}
        />
      </section>

      <ManualEntryModal
        open={manualModalOpen}
        defaultDevice={selectedDevice}
        onClose={() => setManualModalOpen(false)}
        onSubmit={handleManualSubmit}
      />
    </main>
  );
}
