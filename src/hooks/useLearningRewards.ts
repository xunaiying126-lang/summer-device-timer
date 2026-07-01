import { useCallback, useEffect, useMemo, useState } from "react";
import { LEARNING_REWARD_CHILD_ID, LEARNING_TASKS } from "../constants";
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
  readonly getBonusSeconds: (childId: ChildId) => number;
  readonly isTaskCompleted: (taskId: LearningTaskId) => boolean;
  readonly rewardChildId: ChildId;
  readonly saveStatus: SyncStatus;
  readonly saveMessage: string;
  readonly toggleTask: (taskId: LearningTaskId) => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "学习任务同步失败";
}

function getCompletionKey(completion: LearningTaskCompletion): string {
  return `${completion.childId}:${completion.taskId}`;
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

  const completedTaskIds = useMemo(() => {
    return new Set(
      completions
        .filter((completion) => completion.childId === LEARNING_REWARD_CHILD_ID)
        .map((completion) => completion.taskId),
    );
  }, [completions]);

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
    (taskId: LearningTaskId) => {
      const isCompleted = completedTaskIds.has(taskId);
      const nextCompletions = isCompleted
        ? completions.filter(
            (completion) =>
              completion.childId !== LEARNING_REWARD_CHILD_ID || completion.taskId !== taskId,
          )
        : [
            ...completions,
            {
              taskId,
              childId: LEARNING_REWARD_CHILD_ID,
              weekKey,
              completedAt: new Date().toISOString(),
            },
          ];

      persistCompletions(nextCompletions);
      saveToCloud(nextCompletions);
    },
    [completedTaskIds, completions, persistCompletions, saveToCloud, weekKey],
  );

  const getBonusSeconds = useCallback(
    (childId: ChildId) => {
      if (childId !== LEARNING_REWARD_CHILD_ID) {
        return 0;
      }

      return LEARNING_TASKS.reduce(
        (total, task) => total + (completedTaskIds.has(task.id) ? task.rewardSeconds : 0),
        0,
      );
    },
    [completedTaskIds],
  );

  const isTaskCompleted = useCallback(
    (taskId: LearningTaskId) => completedTaskIds.has(taskId),
    [completedTaskIds],
  );

  return {
    completions,
    getBonusSeconds,
    isTaskCompleted,
    rewardChildId: LEARNING_REWARD_CHILD_ID,
    saveStatus,
    saveMessage,
    toggleTask,
  };
}
