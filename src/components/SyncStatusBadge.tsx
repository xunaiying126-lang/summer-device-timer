import { Cloud, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import type { SyncStatus } from "../types";

type SyncStatusBadgeProps = {
  readonly status: SyncStatus;
  readonly message: string;
};

export function SyncStatusBadge({ status, message }: SyncStatusBadgeProps) {
  const Icon =
    status === "local" ? CloudOff : status === "error" ? TriangleAlert : status === "saving" ? Loader2 : Cloud;

  return (
    <span className={`sync-badge sync-badge--${status}`} title={message}>
      <Icon aria-hidden="true" size={16} />
      {message}
    </span>
  );
}
