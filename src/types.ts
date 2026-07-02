export type ChildId = "xsh" | "xmq";

export type DeviceType = "电视" | "手机" | "平板" | "电脑" | "游戏机" | "其他";

export type TimerStatus = "running" | "paused";

export type ManualKind = "add" | "subtract";

export type AppMode = "child" | "parent";

export type LearningTaskId =
  | "chinese-comprehension"
  | "chinese-words"
  | "chinese-reading"
  | "english-words"
  | "english-comprehension"
  | "math-calculation"
  | "olympiad-math";

export type Child = {
  readonly id: ChildId;
  readonly name: string;
  readonly role: string;
  readonly avatarTone: "sun" | "leaf";
};

export type DeviceOption = {
  readonly type: DeviceType;
  readonly label: string;
};

export type LearningTask = {
  readonly id: LearningTaskId;
  readonly title: string;
  readonly detail: string;
  readonly subject: "语文" | "英语" | "数学";
  readonly rewardSeconds: number;
};

export type LearningTaskCompletion = {
  readonly id: string;
  readonly taskId: LearningTaskId;
  readonly childId: ChildId;
  readonly weekKey: string;
  readonly dateKey: string;
  readonly completedAt: string;
};

export type UsageRecord = {
  readonly id: string;
  readonly childId: ChildId;
  readonly weekKey: string;
  readonly deviceType: DeviceType;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationSeconds: number;
  readonly isManual: boolean;
  readonly manualKind?: ManualKind;
  readonly note?: string;
};

export type ActiveTimer = {
  readonly id: string;
  readonly childId: ChildId;
  readonly weekKey: string;
  readonly deviceType: DeviceType;
  readonly startTime: string;
  readonly pausedSeconds: number;
  readonly pausedAt?: string;
  readonly status: TimerStatus;
};

export type ActiveTimersByChild = Record<ChildId, ActiveTimer | null>;

export type AppView = {
  readonly mode: AppMode;
  readonly childId: ChildId | null;
};

export type WeekInfo = {
  readonly weekKey: string;
  readonly label: string;
  readonly rangeLabel: string;
  readonly start: Date;
  readonly end: Date;
};

export type SyncMode = "local" | "cloud";

export type SyncStatus = "local" | "connecting" | "synced" | "saving" | "error";
