import { BookOpenCheck, Calculator, CheckCircle2, Circle, Languages } from "lucide-react";
import { LEARNING_TASKS } from "../constants";
import type { Child, LearningTask, LearningTaskCompletion, LearningTaskId, SyncStatus } from "../types";
import { formatCompactDuration } from "../utils/time";
import { SyncStatusBadge } from "./SyncStatusBadge";

type LearningTasksPanelProps = {
  readonly bonusSeconds: number;
  readonly child: Child;
  readonly completions: readonly LearningTaskCompletion[];
  readonly completedCount: number;
  readonly isTaskCompletedToday: (taskId: LearningTaskId) => boolean;
  readonly onToggleTask: (taskId: LearningTaskId) => void;
  readonly syncMessage: string;
  readonly syncStatus: SyncStatus;
  readonly todayCompletedCount: number;
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
  child,
  completions,
  completedCount,
  isTaskCompletedToday,
  onToggleTask,
  syncMessage,
  syncStatus,
  todayCompletedCount,
}: LearningTasksPanelProps) {
  return (
    <section className="learning-panel" aria-label={`${child.name}学习任务`}>
      <div className="panel-heading panel-heading--stacked">
        <div>
          <h2>{child.name}学习任务打卡</h2>
          <p>每天都可以打卡，每完成 1 项，本周电子产品额度增加 10 分钟。</p>
        </div>
        <SyncStatusBadge status={syncStatus} message={syncMessage} />
      </div>

      <div className="learning-summary">
        <strong>
          今日已打卡 {todayCompletedCount} / {LEARNING_TASKS.length} 项
        </strong>
        <span>本周累计 {completedCount} 次，已奖励 {formatCompactDuration(bonusSeconds)}</span>
      </div>

      <div className="learning-grid">
        {LEARNING_TASKS.map((task) => {
          const completed = isTaskCompletedToday(task.id);
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
                aria-label={`${completed ? "取消今日打卡" : "今日打卡"}${task.title}`}
              >
                {completed ? <CheckCircle2 aria-hidden="true" size={18} /> : <Circle aria-hidden="true" size={18} />}
                {completed ? "今日已打卡" : "打卡"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="learning-history" aria-label={`${child.name}本周打卡记录`}>
        <strong>本周打卡记录</strong>
        {completions.length > 0 ? (
          <ul>
            {completions.slice(0, 10).map((completion) => {
              const task = LEARNING_TASKS.find((item) => item.id === completion.taskId);
              return (
                <li key={completion.id}>
                  <span>{completion.dateKey}</span>
                  <span>{task?.title ?? "学习任务"}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>本周还没有学习打卡。</p>
        )}
      </div>
    </section>
  );
}
