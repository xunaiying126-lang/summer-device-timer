import { useCallback, useState } from "react";
import {
  clearCloudChildRecords,
  deleteCloudRecord,
  isCloudConfigured,
  saveCloudActiveTimer,
  upsertCloudRecord,
} from "../services/cloudSync";
import type { ActiveTimer, ChildId, SyncStatus, UsageRecord } from "../types";

type TimerCloudStatus = {
  readonly cloudEnabled: boolean;
  readonly clearChildRecordsFromCloud: (childId: ChildId, weekKey: string) => void;
  readonly deleteRecordFromCloud: (record: UsageRecord | undefined) => void;
  readonly saveRecordToCloud: (record: UsageRecord) => void;
  readonly saveTimerToCloud: (timer: ActiveTimer | null) => void;
  readonly syncMessage: string;
  readonly syncStatus: SyncStatus;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "同步时发生未知错误";
}

export function useTimerCloudStatus(): TimerCloudStatus {
  const cloudEnabled = isCloudConfigured();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudEnabled ? "connecting" : "local");
  const [syncMessage, setSyncMessage] = useState(
    cloudEnabled ? "正在连接云同步" : "本机 localStorage 保存",
  );

  const markSynced = useCallback(() => {
    setSyncStatus("synced");
    setSyncMessage("云端已同步");
  }, []);

  const markError = useCallback((error: unknown) => {
    setSyncStatus("error");
    setSyncMessage(getErrorMessage(error));
  }, []);

  const saveRecordToCloud = useCallback(
    (record: UsageRecord) => {
      if (!cloudEnabled) {
        return;
      }

      setSyncStatus("saving");
      void upsertCloudRecord(record).then(markSynced).catch(markError);
    },
    [cloudEnabled, markError, markSynced],
  );

  const saveTimerToCloud = useCallback(
    (timer: ActiveTimer | null) => {
      if (!cloudEnabled) {
        return;
      }

      setSyncStatus("saving");
      void saveCloudActiveTimer(timer).then(markSynced).catch(markError);
    },
    [cloudEnabled, markError, markSynced],
  );

  const deleteRecordFromCloud = useCallback(
    (record: UsageRecord | undefined) => {
      if (!record || !cloudEnabled) {
        return;
      }

      setSyncStatus("saving");
      void deleteCloudRecord(record.weekKey, record.id).then(markSynced).catch(markError);
    },
    [cloudEnabled, markError, markSynced],
  );

  const clearChildRecordsFromCloud = useCallback(
    (childId: ChildId, weekKey: string) => {
      if (!cloudEnabled) {
        return;
      }

      setSyncStatus("saving");
      void clearCloudChildRecords(childId, weekKey).then(markSynced).catch(markError);
    },
    [cloudEnabled, markError, markSynced],
  );

  return {
    cloudEnabled,
    clearChildRecordsFromCloud,
    deleteRecordFromCloud,
    saveRecordToCloud,
    saveTimerToCloud,
    syncMessage,
    syncStatus,
  };
}
