import {
  Clock3,
  Gamepad2,
  Laptop,
  MoreHorizontal,
  Smartphone,
  Tablet,
  Tv,
  type LucideIcon,
} from "lucide-react";
import type { Child, ChildId, DeviceOption, DeviceType, LearningTask } from "./types";

export const WEEKLY_LIMIT_SECONDS = 90 * 60;
export const LEARNING_REWARD_SECONDS = 10 * 60;
export const SNAKE_DEVICE_TYPE: DeviceType = "贪吃蛇";

export const CHILDREN_BY_ID = {
  xsh: {
    id: "xsh",
    name: "徐诗涵",
    role: "姐姐",
    avatarTone: "sun",
  },
  xmq: {
    id: "xmq",
    name: "徐沐秋",
    role: "弟弟",
    avatarTone: "leaf",
  },
} satisfies Record<ChildId, Child>;

export const CHILDREN = [CHILDREN_BY_ID.xsh, CHILDREN_BY_ID.xmq] as const;

export const DEVICE_OPTIONS: DeviceOption[] = [
  { type: "电视", label: "电视" },
  { type: "手机", label: "手机" },
  { type: "平板", label: "平板" },
  { type: "电脑", label: "电脑" },
  { type: "游戏机", label: "游戏机" },
  { type: SNAKE_DEVICE_TYPE, label: SNAKE_DEVICE_TYPE },
  { type: "其他", label: "其他" },
];

export const DEVICE_ICONS: Record<DeviceType, LucideIcon> = {
  电视: Tv,
  手机: Smartphone,
  平板: Tablet,
  电脑: Laptop,
  游戏机: Gamepad2,
  贪吃蛇: Gamepad2,
  其他: MoreHorizontal,
};

export const FALLBACK_DEVICE_ICON = Clock3;

export const LEARNING_TASKS = [
  {
    id: "chinese-comprehension",
    title: "语文阅读理解",
    detail: "完成 1 篇",
    subject: "语文",
    rewardSeconds: LEARNING_REWARD_SECONDS,
  },
  {
    id: "chinese-words",
    title: "生字词",
    detail: "掌握 10 个",
    subject: "语文",
    rewardSeconds: LEARNING_REWARD_SECONDS,
  },
  {
    id: "chinese-reading",
    title: "语文阅读",
    detail: "阅读 30 分钟",
    subject: "语文",
    rewardSeconds: LEARNING_REWARD_SECONDS,
  },
  {
    id: "english-words",
    title: "英语单词",
    detail: "背诵 10 个",
    subject: "英语",
    rewardSeconds: LEARNING_REWARD_SECONDS,
  },
  {
    id: "english-comprehension",
    title: "英语阅读理解",
    detail: "完成 1 篇",
    subject: "英语",
    rewardSeconds: LEARNING_REWARD_SECONDS,
  },
  {
    id: "math-calculation",
    title: "数学计算",
    detail: "完成 10 题",
    subject: "数学",
    rewardSeconds: LEARNING_REWARD_SECONDS,
  },
  {
    id: "olympiad-math",
    title: "奥数",
    detail: "完成 2 题",
    subject: "数学",
    rewardSeconds: LEARNING_REWARD_SECONDS,
  },
] as const satisfies readonly LearningTask[];
