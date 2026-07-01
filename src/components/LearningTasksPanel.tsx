import { BookOpenCheck, Calculator, CheckCircle2, Circle, Languages } from "lucide-react";
import { CHILDREN_BY_ID, LEARNING_REWARD_CHILD_ID, LEARNING_TASKS } from "../constants";
import type { LearningTask, LearningTaskId, SyncStatus } from "../types";
import { formatCompactDuration } from "../utils/time";
import { SyncStatusBadge } from "./SyncStatusBadge";

type LearningTasksPanelProps = {
  readonly bonusSeconds: number;
  readonly completedCount: number;
  readonly isTaskCompleted: (taskId: LearningTaskId) => boolean;
  readonly onToggleTask: (taskId: LearningTaskId) => void;
  readonly syncMessage: string;
  readonly syncStatus: SyncStatus;
};

function getSubjectIcon(task: LearningTask) {
  switch (task.subject) {
    case "语文":
      return BookOpenCheck;
    case "英语":
      return Languages;
    case "数学":
      return Calculator;
  }
}

export function LearningTasksPanel({
  bonusSeconds,
  completedCount,
  isTaskCompleted,
  onToggleTask,
  syncMessage,
  syncStatus,
}: LearningTasksPanelProps) {
  const rewardChild = CHILDREN_BY_ID[LEARNING_REWARD_CHILD_ID];

  return (
    <section className="learning-panel" aria-label={`${rewardChild.name}本周学习任务`}>
      <div className="panel-heading panel-heading--stacked">
        <div>
          <h2>{rewardChild.name}本周学习任务</h2>
          <p>每完成 1 项，本周电子产品额度增加 10 分钟。</p>
        </div>
        <SyncStatusBadge status={syncStatus} message={syncMessage} />
      </div>

      <div className="learning-summary">
        <strong>
          已完成 {completedCount} / {LEARNING_TASKS.length} 项
        </strong>
        <span>已奖励 {formatCompactDuration(bonusSeconds)}</span>
      </div>

      <div className="learning-grid">
        {LEARNING_TASKS.map((task) => {
          const completed = isTaskCompleted(task.id);
          const SubjectIcon = getSubjectIcon(task);

          return (
            <article className={`learning-task ${completed ? "learning-task--done" : ""}`} key={task.id}>
              <div className="learning-task__icon" aria-hidden="true">
                <SubjectIcon size={20} />
              </div>
              <div className="learning-task__copy">
                <strong>{task.title}</strong>
                <span>{task.detail}</span>
                <small>奖励 {formatCompactDuration(task.rewardSeconds)}</small>
              </div>
              <button
                className={completed ? "task-toggle task-toggle--done" : "task-toggle"}
                type="button"
                onClick={() => onToggleTask(task.id)}
                aria-pressed={completed}
                aria-label={`${completed ? "取消完成" : "完成"}${task.title}`}
              >
                {completed ? <CheckCircle2 aria-hidden="true" size={18} /> : <Circle aria-hidden="true" size={18} />}
                {completed ? "已完成" : "完成"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
