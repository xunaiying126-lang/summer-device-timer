import { CalendarDays, Settings2, ShieldCheck, UserRound } from "lucide-react";
import type { AppMode, SyncStatus, WeekInfo } from "../types";
import { getAppModeHref } from "../utils/appMode";
import { SyncStatusBadge } from "./SyncStatusBadge";

type HeaderProps = {
  readonly mode: AppMode;
  readonly weekInfo: WeekInfo;
  readonly syncStatus: SyncStatus;
  readonly syncMessage: string;
};

const MODE_COPY: Record<AppMode, { readonly subtitle: string; readonly rule: string }> = {
  child: {
    subtitle: "选择孩子和设备后开始计时，额度每周一自动更新。",
    rule: "孩子端：日常计时和学习打卡",
  },
  parent: {
    subtitle: "查看两个孩子本周情况，补录、修正或重置数据。",
    rule: "家长后台：统一管理本周额度",
  },
};

export function Header({ mode, weekInfo, syncStatus, syncMessage }: HeaderProps) {
  const copy = MODE_COPY[mode];

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
        <p>{copy.subtitle}</p>
        <nav className="mode-switch" aria-label="版本入口">
          <a
            className={mode === "child" ? "mode-switch__item mode-switch__item--active" : "mode-switch__item"}
            href={getAppModeHref("child")}
          >
            <UserRound aria-hidden="true" size={16} />
            孩子端
          </a>
          <a
            className={mode === "parent" ? "mode-switch__item mode-switch__item--active" : "mode-switch__item"}
            href={getAppModeHref("parent")}
          >
            <Settings2 aria-hidden="true" size={16} />
            家长后台
          </a>
        </nav>
      </div>
      <div className="hero__meta">
        <div className="mode-chip">{copy.rule}</div>
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
