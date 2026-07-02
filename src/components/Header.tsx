import { CalendarDays, ShieldCheck } from "lucide-react";
import type { AppMode, Child, SyncStatus, WeekInfo } from "../types";
import { SyncStatusBadge } from "./SyncStatusBadge";

type HeaderProps = {
  readonly mode: AppMode;
  readonly child: Child | null;
  readonly weekInfo: WeekInfo;
  readonly syncStatus: SyncStatus;
  readonly syncMessage: string;
};

export function Header({ mode, child, weekInfo, syncStatus, syncMessage }: HeaderProps) {
  const isParentMode = mode === "parent";
  const subtitle = isParentMode
    ? "查看两个孩子本周情况，补录、修正或重置数据。"
    : `${child?.name ?? "孩子"}专属入口，只显示自己的计时和学习打卡。`;
  const modeLabel = isParentMode ? "家长后台：同时查看并管理两个孩子" : `${child?.name ?? "孩子"}端：独立计时和学习打卡`;

  return (
    <header className="hero">
      <div className="hero__summer" aria-hidden="true">
        <span className="hero__sun" />
        <span className="hero__wave" />
      </div>
      <div className="hero__copy">
        <div className="hero__rule">
          <ShieldCheck aria-hidden="true" size={18} />
          每人每周最多 90 分钟，包括电视时间
        </div>
        <h1>暑假电子产品时间管控</h1>
        <p>{subtitle}</p>
      </div>
      <div className="hero__meta">
        <div className="mode-chip">{modeLabel}</div>
        <div className="week-chip">
          <CalendarDays aria-hidden="true" size={18} />
          <span>{weekInfo.label}</span>
          <small>{weekInfo.rangeLabel}</small>
        </div>
        <SyncStatusBadge status={syncStatus} message={syncMessage} />
      </div>
    </header>
  );
}
