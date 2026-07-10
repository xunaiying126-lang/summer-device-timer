import { BookOpenCheck, Clock3, Gamepad2, History, LayoutDashboard } from "lucide-react";
import type { AppMode } from "../types";

type PageJumpNavProps = {
  readonly mode: AppMode;
};

const childItems = [
  { href: "#timer", icon: Clock3, label: "计时" },
  { href: "#game", icon: Gamepad2, label: "游戏" },
  { href: "#learning", icon: BookOpenCheck, label: "学习" },
  { href: "#records", icon: History, label: "记录" },
] as const;

const parentItems = [
  { href: "#family-overview", icon: LayoutDashboard, label: "总览" },
  { href: "#timer", icon: Clock3, label: "计时" },
  { href: "#learning", icon: BookOpenCheck, label: "学习" },
  { href: "#records", icon: History, label: "记录" },
] as const;

export function PageJumpNav({ mode }: PageJumpNavProps) {
  const items = mode === "parent" ? parentItems : childItems;

  return (
    <nav className="page-jump-nav" aria-label="页面快捷导航">
      {items.map(({ href, icon: Icon, label }) => (
        <a href={href} key={href}>
          <Icon aria-hidden="true" size={18} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
