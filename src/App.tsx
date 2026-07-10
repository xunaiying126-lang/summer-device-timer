import { useEffect, useMemo, useRef, useState } from "react";
import { CHILDREN, CHILDREN_BY_ID, SNAKE_DEVICE_TYPE, WEEKLY_LIMIT_SECONDS } from "./constants";
import { ChildCard } from "./components/ChildCard";
import { FamilySummary } from "./components/FamilySummary";
import { Header } from "./components/Header";
import { LearningTasksPanel } from "./components/LearningTasksPanel";
import { ManualEntryModal } from "./components/ManualEntryModal";
import { PageJumpNav } from "./components/PageJumpNav";
import { RecordsList } from "./components/RecordsList";
import { SnakeGamePanel } from "./components/SnakeGamePanel";
import { TimerPanel } from "./components/TimerPanel";
import { WeeklyOverview } from "./components/WeeklyOverview";
import { useDeviceTimer } from "./hooks/useDeviceTimer";
import { useLearningRewards } from "./hooks/useLearningRewards";
import type { ChildId, DeviceType } from "./types";
import { getAppViewFromLocation } from "./utils/appMode";
import { getWeekInfo } from "./utils/time";

const DEFAULT_CHILD_ID: ChildId = "xsh";
const DEFAULT_DEVICE: DeviceType = "电视";

export function App() {
  const appView = useMemo(() => getAppViewFromLocation(window.location), []);
  const appMode = appView.mode;
  const isParentMode = appMode === "parent";
  const lockedChildId = appView.childId;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedChildId, setSelectedChildId] = useState<ChildId>(() => lockedChildId ?? DEFAULT_CHILD_ID);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(DEFAULT_DEVICE);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const autoStopTimerIdRef = useRef<Set<string>>(new Set());
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
  const visibleChildren = useMemo(
    () => (isParentMode ? CHILDREN : [CHILDREN_BY_ID[lockedChildId ?? DEFAULT_CHILD_ID]]),
    [isParentMode, lockedChildId],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    document.title = isParentMode ? "家长后台 - 暑假电子产品时间管控" : `${selectedChild.name}端 - 暑假电子产品时间管控`;
  }, [isParentMode, selectedChild.name]);

  useEffect(() => {
    CHILDREN.forEach((child) => {
      const activeTimer = timer.getActiveTimer(child.id);
      if (!activeTimer || activeTimer.weekKey !== weekInfo.weekKey || activeTimer.status !== "running") {
        return;
      }

      if (timer.getUsedSeconds(activeTimer.childId) < timer.getWeeklyLimitSeconds(activeTimer.childId)) {
        return;
      }

      if (autoStopTimerIdRef.current.has(activeTimer.id)) {
        return;
      }

      autoStopTimerIdRef.current.add(activeTimer.id);
      timer.endTimer(activeTimer.childId, { autoStopped: true });
      window.alert("本周额度已用完，请休息眼睛，去做别的事情吧");
    });
  }, [timer, weekInfo.weekKey]);

  const handleStart = () => {
    const started = timer.startTimer(selectedChildId, selectedDevice);
    if (!started && selectedUsedSeconds >= selectedLimitSeconds) {
      window.alert("本周电子产品时间已用完");
    }
  };

  const handleEnd = () => {
    timer.endTimer(selectedChildId);
  };

  const handleStartSnakeGame = () => {
    const started = timer.startTimer(selectedChildId, SNAKE_DEVICE_TYPE);
    if (started) {
      setSelectedDevice(SNAKE_DEVICE_TYPE);
      return true;
    }

    if (selectedUsedSeconds >= selectedLimitSeconds) {
      window.alert("本周电子产品时间已用完");
    }
    return false;
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
    <main className={`app-shell app-shell--${appMode}`}>
      <Header
        mode={appMode}
        child={isParentMode ? null : selectedChild}
        weekInfo={weekInfo}
        syncStatus={timer.syncStatus}
        syncMessage={timer.syncMessage}
      />

      <PageJumpNav mode={appMode} />

      {isParentMode ? (
        <FamilySummary
          activeTimer={timer.activeTimer}
          children={CHILDREN}
          getLimitSeconds={timer.getWeeklyLimitSeconds}
          getTodayCompletedCount={learning.getTodayCompletedCount}
          getUsedSeconds={timer.getUsedSeconds}
        />
      ) : null}

      <section className="children-grid" aria-label="孩子选择">
        {visibleChildren.map((child) => (
          <ChildCard
            child={child}
            key={child.id}
            limitSeconds={timer.getWeeklyLimitSeconds(child.id)}
            selected={child.id === selectedChildId}
            usedSeconds={timer.getUsedSeconds(child.id)}
            onSelect={() => {
              if (isParentMode) {
                setSelectedChildId(child.id);
              }
            }}
          />
        ))}
      </section>

      <TimerPanel
        activeElapsedSeconds={timer.getActiveElapsedSeconds(selectedChildId)}
        activeTimer={timer.getActiveTimer(selectedChildId)}
        mode={appMode}
        selectedChild={selectedChild}
        selectedDevice={selectedDevice}
        weeklyLimitSeconds={selectedLimitSeconds}
        usedSeconds={selectedUsedSeconds}
        onDeviceChange={setSelectedDevice}
        onStart={handleStart}
        onPause={() => timer.pauseTimer(selectedChildId)}
        onResume={() => timer.resumeTimer(selectedChildId)}
        onEnd={handleEnd}
        {...(isParentMode ? { onOpenManual: () => setManualModalOpen(true), onReset: handleReset } : {})}
      />

      {!isParentMode ? (
        <SnakeGamePanel
          activeElapsedSeconds={timer.getActiveElapsedSeconds(selectedChildId)}
          activeTimer={timer.getActiveTimer(selectedChildId)}
          child={selectedChild}
          mode={appMode}
          usedSeconds={selectedUsedSeconds}
          weeklyLimitSeconds={selectedLimitSeconds}
          onStartGame={handleStartSnakeGame}
          onPauseGame={() => timer.pauseTimer(selectedChildId)}
          onResumeGame={() => timer.resumeTimer(selectedChildId)}
          onEndGame={() => timer.endTimer(selectedChildId)}
        />
      ) : null}

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
        <RecordsList records={selectedRecords} {...(isParentMode ? { onDelete: handleDeleteRecord } : {})} />
        <WeeklyOverview
          children={visibleChildren}
          getLimitSeconds={timer.getWeeklyLimitSeconds}
          getUsedSeconds={timer.getUsedSeconds}
        />
      </section>

      <ManualEntryModal
        open={isParentMode && manualModalOpen}
        defaultDevice={selectedDevice}
        onClose={() => setManualModalOpen(false)}
        onSubmit={handleManualSubmit}
      />
    </main>
  );
}
