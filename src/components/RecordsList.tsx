import { Trash2 } from "lucide-react";
import type { UsageRecord } from "../types";
import { formatCompactDuration, formatDateLabel, formatTimeLabel } from "../utils/time";

type RecordsListProps = {
  readonly records: readonly UsageRecord[];
  readonly onDelete: (recordId: string) => void;
};

export function RecordsList({ records, onDelete }: RecordsListProps) {
  return (
    <section className="records-panel">
      <div className="panel-heading">
        <h2>本周记录</h2>
        <span>{records.length} 条</span>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">这一周还没有记录，开始计时后会显示在这里。</div>
      ) : (
        <div className="records-table" role="table" aria-label="本周使用记录">
          <div className="records-table__row records-table__row--head" role="row">
            <span role="columnheader">日期</span>
            <span role="columnheader">开始时间</span>
            <span role="columnheader">结束时间</span>
            <span role="columnheader">设备</span>
            <span role="columnheader">使用时长</span>
            <span role="columnheader">来源</span>
            <span role="columnheader">操作</span>
          </div>
          {records.map((record) => (
            <div className="records-table__row" role="row" key={record.id}>
              <span role="cell">{formatDateLabel(record.startTime)}</span>
              <span role="cell">{formatTimeLabel(record.startTime)}</span>
              <span role="cell">{formatTimeLabel(record.endTime)}</span>
              <span role="cell">{record.deviceType}</span>
              <span className={record.durationSeconds < 0 ? "duration-negative" : ""} role="cell">
                {formatCompactDuration(record.durationSeconds)}
              </span>
              <span role="cell">
                {record.isManual ? (record.manualKind === "subtract" ? "手动修正" : "补录") : "计时"}
                {record.note ? <small>{record.note}</small> : null}
              </span>
              <span role="cell">
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  aria-label="删除记录"
                  onClick={() => onDelete(record.id)}
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
