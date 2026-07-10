import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeCloudActiveTimers, subscribeCloudRecords } from "../services/cloudSync";
import type { ActiveTimer, ActiveTimersByChild, ChildId, DeviceType, UsageRecord } from "../types";
import { loadActiveTimers, loadRecords, saveActiveTimer, saveRecords } from "../utils/storage";
import { createId, getActiveElapsedSeconds as getTimerElapsedSeconds, sortRecords, sumRecordSeconds } from "../utils/time";
import { createManualRecord, type ManualRecordInput } from "../utils/timerRecords";
import { useTimerCloudStatus } from "./useTimerCloudStatus";

type WeeklyLimitSecondsByChild = Record<ChildId, number>;
type EndTimerOptions = { readonly autoStopped?: boolean };

const childIds: readonly ChildId[] = ["xsh", "xmq"];

function getChildRecords(records: readonly UsageRecord[], childId: ChildId): UsageRecord[] {
  return records.filter((record) => record.childId === childId);
}

export function useDeviceTimer(weekKey: string, nowMs: number, weeklyLimitSecondsByChild: WeeklyLimitSecondsByChild) {
  const {
    clearChildRecordsFromCloud,
    cloudEnabled,
    deleteRecordFromCloud,
    markCloudError,
    markCloudReady,
    saveRecordToCloud,
    saveTimerToCloud,
    syncMessage,
    syncStatus,
  } = useTimerCloudStatus();
  const [records, setRecords] = useState<UsageRecord[]>(() => loadRecords(weekKey));
  const [activeTimers, setActiveTimers] = useState<ActiveTimersByChild>(() => loadActiveTimers());

  const persistRecords = useCallback(
    (nextRecords: readonly UsageRecord[]) => {
      const sorted = sortRecords([...nextRecords]);
      setRecords(sorted);
      saveRecords(weekKey, sorted);
    },
    [weekKey],
  );

  const persistActiveTimer = useCallback((childId: ChildId, timer: ActiveTimer | null) => {
    setActiveTimers((currentTimers) => ({ ...currentTimers, [childId]: timer }));
    saveActiveTimer(childId, timer);
  }, []);

  useEffect(() => {
    persistRecords(loadRecords(weekKey));
  }, [persistRecords, weekKey]);

  useEffect(() => {
    childIds.forEach((childId) => {
      const timer = activeTimers[childId];
      if (timer && timer.weekKey !== weekKey) {
        persistActiveTimer(childId, null);
        saveTimerToCloud(childId, null);
      }
    });
  }, [activeTimers, persistActiveTimer, saveTimerToCloud, weekKey]);

  useEffect(() => {
    if (!cloudEnabled) {
      return () => undefined;
    }

    return subscribeCloudRecords(
      weekKey,
      (cloudRecords) => {
        persistRecords(cloudRecords);
        markCloudReady();
      },
      markCloudError,
    );
  }, [cloudEnabled, markCloudError, markCloudReady, persistRecords, weekKey]);

  useEffect(() => {
    if (!cloudEnabled) {
      return () => undefined;
    }

    return subscribeCloudActiveTimers(
      (cloudTimers) => {
        setActiveTimers((localTimers) => {
          const nextTimers: ActiveTimersByChild = { ...cloudTimers };

          childIds.forEach((childId) => {
            const localTimer = localTimers[childId];
            const cloudTimer = cloudTimers[childId];
            const localTimerAlreadyRecorded = localTimer
              ? records.some((record) => record.id === localTimer.id)
              : false;

            if (!cloudTimer && localTimer && localTimer.weekKey === weekKey && !localTimerAlreadyRecorded) {
              nextTimers[childId] = localTimer;
              saveTimerToCloud(childId, localTimer);
            }
          });

          childIds.forEach((childId) => saveActiveTimer(childId, nextTimers[childId]));
          return nextTimers;
        });
        markCloudReady();
      },
      markCloudError,
    );
  }, [cloudEnabled, markCloudError, markCloudReady, records, saveTimerToCloud, weekKey]);

  const getActiveTimer = useCallback(
    (childId: ChildId) => {
      const timer = activeTimers[childId];
      if (!timer || timer.weekKey !== weekKey) {
        return null;
      }

      return timer;
    },
    [activeTimers, weekKey],
  );

  const getRecordedSeconds = useCallback(
    (childId: ChildId) => sumRecordSeconds(getChildRecords(records, childId)),
    [records],
  );

  const getUsedSeconds = useCallback(
    (childId: ChildId) => {
      const recordedSeconds = getRecordedSeconds(childId);
      const weeklyLimitSeconds = weeklyLimitSecondsByChild[childId];
      const timer = getActiveTimer(childId);
      if (!timer) {
        return Math.min(weeklyLimitSeconds, recordedSeconds);
      }

      return Math.min(
        weeklyLimitSeconds,
        recordedSeconds + getTimerElapsedSeconds(timer, nowMs),
      );
    },
    [getActiveTimer, getRecordedSeconds, nowMs, weeklyLimitSecondsByChild],
  );

  const getWeeklyLimitSeconds = useCallback((childId: ChildId) => weeklyLimitSecondsByChild[childId], [weeklyLimitSecondsByChild]);

  const getActiveElapsedSeconds = useCallback(
    (childId: ChildId) => {
      const timer = getActiveTimer(childId);
      if (!timer) {
        return 0;
      }

      return getTimerElapsedSeconds(timer, nowMs);
    },
    [getActiveTimer, nowMs],
  );

  const hasRunningOrPausedTimer = useMemo(() => {
    return childIds.some((childId) => Boolean(getActiveTimer(childId)));
  }, [getActiveTimer]);

  const getAnyActiveTimer = useCallback(() => {
    return childIds.map((childId) => getActiveTimer(childId)).find((timer): timer is ActiveTimer => Boolean(timer)) ?? null;
  }, [getActiveTimer]);

  const activeTimer = getAnyActiveTimer();
  const activeElapsedSeconds = activeTimer ? getTimerElapsedSeconds(activeTimer, nowMs) : 0;

  const startTimer = useCallback(
    (childId: ChildId, deviceType: DeviceType): boolean => {
      if (getActiveTimer(childId)) {
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

      persistActiveTimer(childId, timer);
      saveTimerToCloud(childId, timer);
      return true;
    },
    [getActiveTimer, getUsedSeconds, getWeeklyLimitSeconds, persistActiveTimer, saveTimerToCloud, weekKey],
  );

  const pauseTimer = useCallback((childId: ChildId) => {
    const activeTimer = getActiveTimer(childId);
    if (!activeTimer || activeTimer.status !== "running") {
      return;
    }

    const timer: ActiveTimer = {
      ...activeTimer,
      pausedAt: new Date().toISOString(),
      status: "paused",
    };

    persistActiveTimer(childId, timer);
    saveTimerToCloud(childId, timer);
  }, [getActiveTimer, persistActiveTimer, saveTimerToCloud]);

  const resumeTimer = useCallback((childId: ChildId) => {
    const activeTimer = getActiveTimer(childId);
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

    persistActiveTimer(childId, timer);
    saveTimerToCloud(childId, timer);
  }, [getActiveTimer, persistActiveTimer, saveTimerToCloud]);

  const endTimer = useCallback(
    (childId: ChildId, options?: EndTimerOptions) => {
      const activeTimer = getActiveTimer(childId);
      if (!activeTimer) {
        return null;
      }

      const recordedSeconds = getRecordedSeconds(activeTimer.childId);
      const elapsedSeconds = getTimerElapsedSeconds(activeTimer, Date.now());
      const availableSeconds = Math.max(0, getWeeklyLimitSeconds(activeTimer.childId) - recordedSeconds);
      const durationSeconds = Math.min(elapsedSeconds, availableSeconds);
      const nextTimer = null;

      persistActiveTimer(childId, nextTimer);
      saveTimerToCloud(childId, nextTimer);

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
    [getActiveTimer, getRecordedSeconds, getWeeklyLimitSeconds, persistActiveTimer, persistRecords, records, saveRecordToCloud, saveTimerToCloud],
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

      if (getActiveTimer(childId)) {
        persistActiveTimer(childId, null);
        saveTimerToCloud(childId, null);
      }
      clearChildRecordsFromCloud(childId, weekKey);
    },
    [clearChildRecordsFromCloud, getActiveTimer, persistActiveTimer, persistRecords, records, saveTimerToCloud, weekKey],
  );

  return {
    activeElapsedSeconds,
    activeTimer,
    activeTimers,
    addManualRecord,
    cloudEnabled,
    deleteRecord,
    endTimer,
    getActiveElapsedSeconds,
    getActiveTimer,
    getRecordedSeconds,
    getWeeklyLimitSeconds,
    getUsedSeconds,
    hasRunningOrPausedTimer,
    pauseTimer,
    records,
    resetChildWeek,
    resumeTimer,
    startTimer,
    syncMessage,
    syncStatus,
  };
}
