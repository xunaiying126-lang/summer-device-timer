import { useCallback, useEffect, useMemo, useState } from "react";
import { LEARNING_TASKS } from "../constants";
import {
  isCloudConfigured,
  saveCloudLearningTaskCompletions,
  subscribeCloudLearningTaskCompletions,
} from "../services/cloudSync";
import type { ChildId, LearningTaskCompletion, LearningTaskId, SyncStatus } from "../types";
import {
  loadLearningTaskCompletions,
  saveLearningTaskCompletions,
} from "../utils/storage";

type LearningRewardsState = {
  readonly completions: readonly LearningTaskCompletion[];
  readonly getChildCompletions: (childId: ChildId) => LearningTaskCompletion[];
  readonly getBonusSeconds: (childId: ChildId) => number;
  readonly getCompletedCount: (childId: ChildId) => number;
  readonly getTodayCompletedCount: (childId: ChildId) => number;
  readonly isTaskCompletedToday: (childId: ChildId, taskId: LearningTaskId) => boolean;
  readonly saveStatus: SyncStatus;
  readonly saveMessage: string;
  readonly toggleTask: (childId: ChildId, taskId: LearningTaskId) => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "学习任务同步失败";
}

function getCompletionKey(completion: LearningTaskCompletion): string {
  return completion.id;
}

function createCompletionId(childId: ChildId, taskId: LearningTaskId, dateKey: string): string {
  return `${childId}:${taskId}:${dateKey}`;
}

function getDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dedupeCompletions(
  completions: readonly LearningTaskCompletion[],
): LearningTaskCompletion[] {
  const seen = new Set<string>();
  const unique: LearningTaskCompletion[] = [];

  for (const completion of completions) {
    const key = getCompletionKey(completion);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(completion);
    }
  }

  return unique;
}

export function useLearningRewards(weekKey: string): LearningRewardsState {
  const cloudEnabled = isCloudConfigured();
  const [completions, setCompletions] = useState<LearningTaskCompletion[]>(() =>
    loadLearningTaskCompletions(weekKey),
  );
  const [saveStatus, setSaveStatus] = useState<SyncStatus>(cloudEnabled ? "connecting" : "local");
  const [saveMessage, setSaveMessage] = useState(
    cloudEnabled ? "学习任务云同步连接中" : "学习任务保存在本机",
  );

  const persistCompletions = useCallback(
    (nextCompletions: readonly LearningTaskCompletion[]) => {
      const unique = dedupeCompletions(nextCompletions);
      setCompletions(unique);
      saveLearningTaskCompletions(weekKey, unique);
    },
    [weekKey],
  );

  useEffect(() => {
    persistCompletions(loadLearningTaskCompletions(weekKey));
  }, [persistCompletions, weekKey]);

  useEffect(() => {
    if (!cloudEnabled) {
      setSaveStatus("local");
      setSaveMessage("学习任务保存在本机");
      return () => undefined;
    }

    setSaveStatus("connecting");
    setSaveMessage("学习任务云同步连接中");

    return subscribeCloudLearningTaskCompletions(
      weekKey,
      (cloudCompletions) => {
        persistCompletions(cloudCompletions);
        setSaveStatus("synced");
        setSaveMessage("学习任务云端已同步");
      },
      (error) => {
        setSaveStatus("error");
        setSaveMessage(error.message);
      },
    );
  }, [cloudEnabled, persistCompletions, weekKey]);

  const todayKey = getDateKey();

  const completionsByChild = useMemo(() => {
    return completions.reduce<Record<ChildId, LearningTaskCompletion[]>>(
      (grouped, completion) => {
        grouped[completion.childId].push(completion);
        return grouped;
      },
      { xsh: [], xmq: [] },
    );
  }, [completions]);

  const todayCompletionKeys = useMemo(
    () => new Set(completions.map((completion) => createCompletionId(completion.childId, completion.taskId, completion.dateKey))),
    [completions],
  );

  const saveToCloud = useCallback(
    (nextCompletions: readonly LearningTaskCompletion[]) => {
      if (!cloudEnabled) {
        return;
      }

      setSaveStatus("saving");
      void saveCloudLearningTaskCompletions(weekKey, nextCompletions)
        .then(() => {
          setSaveStatus("synced");
          setSaveMessage("学习任务云端已同步");
        })
        .catch((error: unknown) => {
          setSaveStatus("error");
          setSaveMessage(getErrorMessage(error));
        });
    },
    [cloudEnabled, weekKey],
  );

  const toggleTask = useCallback(
    (childId: ChildId, taskId: LearningTaskId) => {
      const dateKey = getDateKey();
      const completionId = createCompletionId(childId, taskId, dateKey);
      const isCompleted = todayCompletionKeys.has(completionId);
      const nextCompletions = isCompleted
        ? completions.filter((completion) => completion.id !== completionId)
        : [
            ...completions,
            {
              id: completionId,
              taskId,
              childId,
              weekKey,
              dateKey,
              completedAt: new Date().toISOString(),
            },
          ];

      persistCompletions(nextCompletions);
      saveToCloud(nextCompletions);
    },
    [completions, persistCompletions, saveToCloud, todayCompletionKeys, weekKey],
  );

  const getBonusSeconds = useCallback(
    (childId: ChildId) => {
      return completionsByChild[childId].reduce((total, completion) => {
        const task = LEARNING_TASKS.find((item) => item.id === completion.taskId);
        return total + (task?.rewardSeconds ?? 0);
      }, 0);
    },
    [completionsByChild],
  );

  const getChildCompletions = useCallback(
    (childId: ChildId) => [...completionsByChild[childId]].sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [completionsByChild],
  );

  const getCompletedCount = useCallback(
    (childId: ChildId) => completionsByChild[childId].length,
    [completionsByChild],
  );

  const getTodayCompletedCount = useCallback(
    (childId: ChildId) => completionsByChild[childId].filter((completion) => completion.dateKey === todayKey).length,
    [completionsByChild, todayKey],
  );

  const isTaskCompletedToday = useCallback(
    (childId: ChildId, taskId: LearningTaskId) => todayCompletionKeys.has(createCompletionId(childId, taskId, todayKey)),
    [todayCompletionKeys, todayKey],
  );

  return {
    completions,
    getChildCompletions,
    getBonusSeconds,
    getCompletedCount,
    getTodayCompletedCount,
    isTaskCompletedToday,
    saveStatus,
    saveMessage,
    toggleTask,
  };
}
