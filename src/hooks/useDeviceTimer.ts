import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeCloudActiveTimer, subscribeCloudRecords } from "../services/cloudSync";
import type { ActiveTimer, ChildId, DeviceType, UsageRecord } from "../types";
import { loadActiveTimer, loadRecords, saveActiveTimer, saveRecords } from "../utils/storage";
import { createId, getActiveElapsedSeconds, sortRecords, sumRecordSeconds } from "../utils/time";
import { createManualRecord, type ManualRecordInput } from "../utils/timerRecords";
import { useTimerCloudStatus } from "./useTimerCloudStatus";

type WeeklyLimitSecondsByChild = Record<ChildId, number>;

function getChildRecords(records: readonly UsageRecord[], childId: ChildId): UsageRecord[] {
  return records.filter((record) => record.childId === childId);
}

export function useDeviceTimer(weekKey: string, nowMs: number, weeklyLimitSecondsByChild: WeeklyLimitSecondsByChild) {
  const {
    clearChildRecordsFromCloud,
    cloudEnabled,
    deleteRecordFromCloud,
    saveRecordToCloud,
    saveTimerToCloud,
    syncMessage,
    syncStatus,
  } = useTimerCloudStatus();
  const [records, setRecords] = useState<UsageRecord[]>(() => loadRecords(weekKey));
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => loadActiveTimer());

  const persistRecords = useCallback(
    (nextRecords: readonly UsageRecord[]) => {
      const sorted = sortRecords([...nextRecords]);
      setRecords(sorted);
      saveRecords(weekKey, sorted);
    },
    [weekKey],
  );

  const persistActiveTimer = useCallback((timer: ActiveTimer | null) => {
    setActiveTimer(timer);
    saveActiveTimer(timer);
  }, []);

  useEffect(() => {
    persistRecords(loadRecords(weekKey));
  }, [persistRecords, weekKey]);

  useEffect(() => {
    if (activeTimer && activeTimer.weekKey !== weekKey) {
      persistActiveTimer(null);
      saveTimerToCloud(null);
    }
  }, [activeTimer, persistActiveTimer, saveTimerToCloud, weekKey]);

  useEffect(() => {
    if (!cloudEnabled) {
      return () => undefined;
    }

    return subscribeCloudRecords(
      weekKey,
      (cloudRecords) => {
        persistRecords(cloudRecords);
      },
      () => undefined,
    );
  }, [cloudEnabled, persistRecords, weekKey]);

  useEffect(() => {
    if (!cloudEnabled) {
      return () => undefined;
    }

    return subscribeCloudActiveTimer(
      (timer) => {
        persistActiveTimer(timer);
      },
      () => undefined,
    );
  }, [cloudEnabled, persistActiveTimer]);

  const getRecordedSeconds = useCallback(
    (childId: ChildId) => sumRecordSeconds(getChildRecords(records, childId)),
    [records],
  );

  const getUsedSeconds = useCallback(
    (childId: ChildId) => {
      const recordedSeconds = getRecordedSeconds(childId);
      const weeklyLimitSeconds = weeklyLimitSecondsByChild[childId];
      if (!activeTimer || activeTimer.childId !== childId || activeTimer.weekKey !== weekKey) {
        return Math.min(weeklyLimitSeconds, recordedSeconds);
      }

      return Math.min(
        weeklyLimitSeconds,
        recordedSeconds + getActiveElapsedSeconds(activeTimer, nowMs),
      );
    },
    [activeTimer, getRecordedSeconds, nowMs, weekKey, weeklyLimitSecondsByChild],
  );

  const getWeeklyLimitSeconds = useCallback((childId: ChildId) => weeklyLimitSecondsByChild[childId], [weeklyLimitSecondsByChild]);

  const activeElapsedSeconds = useMemo(() => {
    if (!activeTimer || activeTimer.weekKey !== weekKey) {
      return 0;
    }

    return getActiveElapsedSeconds(activeTimer, nowMs);
  }, [activeTimer, nowMs, weekKey]);

  const startTimer = useCallback(
    (childId: ChildId, deviceType: DeviceType): boolean => {
      if (activeTimer) {
        return false;
      }

      if (getUsedSeconds(childId) >= getWeeklyLimitSeconds(childId)) {
        return false;
      }

      const timer: ActiveTimer = {
        id: createId(),
        childId,
        weekKey,
        deviceType,
        startTime: new Date().toISOString(),
        pausedSeconds: 0,
        status: "running",
      };

      persistActiveTimer(timer);
      saveTimerToCloud(timer);
      return true;
    },
    [activeTimer, getUsedSeconds, getWeeklyLimitSeconds, persistActiveTimer, saveTimerToCloud, weekKey],
  );

  const pauseTimer = useCallback(() => {
    if (!activeTimer || activeTimer.status !== "running") {
      return;
    }

    const timer: ActiveTimer = {
      ...activeTimer,
      pausedAt: new Date().toISOString(),
      status: "paused",
    };

    persistActiveTimer(timer);
    saveTimerToCloud(timer);
  }, [activeTimer, persistActiveTimer, saveTimerToCloud]);

  const resumeTimer = useCallback(() => {
    if (!activeTimer || activeTimer.status !== "paused" || !activeTimer.pausedAt) {
      return;
    }

    const pausedDelta = Math.max(
      0,
      Math.floor((Date.now() - new Date(activeTimer.pausedAt).getTime()) / 1000),
    );
    const timer: ActiveTimer = {
      id: activeTimer.id,
      childId: activeTimer.childId,
      weekKey: activeTimer.weekKey,
      deviceType: activeTimer.deviceType,
      startTime: activeTimer.startTime,
      pausedSeconds: activeTimer.pausedSeconds + pausedDelta,
      status: "running",
    };

    persistActiveTimer(timer);
    saveTimerToCloud(timer);
  }, [activeTimer, persistActiveTimer, saveTimerToCloud]);

  const endTimer = useCallback(
    (options?: { readonly autoStopped?: boolean }) => {
      if (!activeTimer) {
        return null;
      }

      const recordedSeconds = getRecordedSeconds(activeTimer.childId);
      const elapsedSeconds = getActiveElapsedSeconds(activeTimer, Date.now());
      const availableSeconds = Math.max(0, getWeeklyLimitSeconds(activeTimer.childId) - recordedSeconds);
      const durationSeconds = Math.min(elapsedSeconds, availableSeconds);
      const nextTimer = null;

      persistActiveTimer(nextTimer);
      saveTimerToCloud(nextTimer);

      if (durationSeconds <= 0) {
        return null;
      }

      const record: UsageRecord = {
        id: activeTimer.id,
        childId: activeTimer.childId,
        weekKey: activeTimer.weekKey,
        deviceType: activeTimer.deviceType,
        startTime: activeTimer.startTime,
        endTime: new Date().toISOString(),
        durationSeconds,
        isManual: false,
        ...(options?.autoStopped ? { note: "达到本周额度后自动结束" } : {}),
      };

      persistRecords([...records, record]);
      saveRecordToCloud(record);
      return record;
    },
    [activeTimer, getRecordedSeconds, persistActiveTimer, persistRecords, records, saveRecordToCloud, saveTimerToCloud],
  );

  const addManualRecord = useCallback(
    (input: ManualRecordInput) => {
      const result = createManualRecord({
        input,
        usedSeconds: getUsedSeconds(input.childId),
        weeklyLimitSeconds: getWeeklyLimitSeconds(input.childId),
      });

      if (result.kind !== "created") {
        return result;
      }

      const record = result.record;
      persistRecords([...records, record]);
      saveRecordToCloud(record);

      return result;
    },
    [getUsedSeconds, getWeeklyLimitSeconds, persistRecords, records, saveRecordToCloud],
  );

  const deleteRecord = useCallback(
    (recordId: string) => {
      const target = records.find((record) => record.id === recordId);
      const nextRecords = records.filter((record) => record.id !== recordId);
      persistRecords(nextRecords);
      deleteRecordFromCloud(target);
    },
    [deleteRecordFromCloud, persistRecords, records],
  );

  const resetChildWeek = useCallback(
    (childId: ChildId) => {
      const nextRecords = records.filter((record) => record.childId !== childId);
      persistRecords(nextRecords);

      if (activeTimer?.childId === childId) {
        persistActiveTimer(null);
        saveTimerToCloud(null);
      }
      clearChildRecordsFromCloud(childId, weekKey);
    },
    [activeTimer, clearChildRecordsFromCloud, persistActiveTimer, persistRecords, records, saveTimerToCloud, weekKey],
  );

  return {
    activeElapsedSeconds,
    activeTimer,
    addManualRecord,
    cloudEnabled,
    deleteRecord,
    endTimer,
    getRecordedSeconds,
    getWeeklyLimitSeconds,
    getUsedSeconds,
    pauseTimer,
    records,
    resetChildWeek,
    resumeTimer,
    startTimer,
    syncMessage,
    syncStatus,
  };
}
