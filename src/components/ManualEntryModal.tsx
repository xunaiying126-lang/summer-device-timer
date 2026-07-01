import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { DEVICE_OPTIONS } from "../constants";
import type { DeviceType, ManualKind } from "../types";
import { isDeviceType } from "../utils/guards";

type ManualEntryModalProps = {
  readonly open: boolean;
  readonly defaultDevice: DeviceType;
  readonly onClose: () => void;
  readonly onSubmit: (input: {
    readonly deviceType: DeviceType;
    readonly minutes: number;
    readonly kind: ManualKind;
    readonly note?: string;
  }) => void;
};

export function ManualEntryModal({ open, defaultDevice, onClose, onSubmit }: ManualEntryModalProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>(defaultDevice);
  const [minutes, setMinutes] = useState("10");
  const [kind, setKind] = useState<ManualKind>("add");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setDeviceType(defaultDevice);
    setMinutes("10");
    setKind("add");
    setNote("");
    setError("");
  }, [defaultDevice, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = () => {
    const minuteValue = Number(minutes);

    if (!Number.isFinite(minuteValue) || minuteValue <= 0) {
      setError("请输入大于 0 的分钟数");
      return;
    }

    const trimmedNote = note.trim();

    if (trimmedNote) {
      onSubmit({
        deviceType,
        minutes: minuteValue,
        kind,
        note: trimmedNote,
      });
      return;
    }

    onSubmit({
      deviceType,
      minutes: minuteValue,
      kind,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="manual-modal-title">
        <div className="modal__header">
          <h2 id="manual-modal-title">补录或修正时间</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭弹窗">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>调整类型</span>
            <div className="segmented">
              <button
                type="button"
                className={kind === "add" ? "segmented__item segmented__item--active" : "segmented__item"}
                onClick={() => setKind("add")}
              >
                补录增加
              </button>
              <button
                type="button"
                className={kind === "subtract" ? "segmented__item segmented__item--active" : "segmented__item"}
                onClick={() => setKind("subtract")}
              >
                修正减少
              </button>
            </div>
          </label>

          <label className="field">
            <span>设备类型</span>
            <select
              value={deviceType}
              onChange={(event) => {
                const nextDevice = event.target.value;
                if (isDeviceType(nextDevice)) {
                  setDeviceType(nextDevice);
                }
              }}
            >
              {DEVICE_OPTIONS.map((device) => (
                <option key={device.type} value={device.type}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>分钟数</span>
            <input
              type="number"
              min="1"
              max="90"
              step="1"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>

          <label className="field">
            <span>备注（可选）</span>
            <textarea
              rows={3}
              placeholder="例如：补录电视时间、修正误点记录"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal__actions">
          <button className="button button--ghost" type="button" onClick={onClose}>
            取消
          </button>
          <button className="button button--primary" type="button" onClick={handleSubmit}>
            确认加入记录
          </button>
        </div>
      </div>
    </div>
  );
}
