import { CalendarDays, ShieldCheck } from "lucide-react";
import type { SyncStatus, WeekInfo } from "../types";
import { SyncStatusBadge } from "./SyncStatusBadge";

type HeaderProps = {
  readonly weekInfo: WeekInfo;
  readonly syncStatus: SyncStatus;
  readonly syncMessage: string;
};

export function Header({ weekInfo, syncStatus, syncMessage }: HeaderProps) {
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
        <p>选择孩子和设备后开始计时，额度用完自动停止。</p>
      </div>
      <div className="hero__meta">
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
