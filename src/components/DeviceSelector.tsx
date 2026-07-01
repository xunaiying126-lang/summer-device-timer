import { DEVICE_ICONS, DEVICE_OPTIONS } from "../constants";
import type { DeviceType } from "../types";

type DeviceSelectorProps = {
  readonly selectedDevice: DeviceType;
  readonly disabled?: boolean;
  readonly onChange: (deviceType: DeviceType) => void;
};

export function DeviceSelector({ selectedDevice, disabled = false, onChange }: DeviceSelectorProps) {
  return (
    <div className="device-grid" role="radiogroup" aria-label="选择当前使用的设备">
      {DEVICE_OPTIONS.map((device) => {
        const Icon = DEVICE_ICONS[device.type];
        const active = selectedDevice === device.type;

        return (
          <button
            key={device.type}
            type="button"
            className={`device-button ${active ? "device-button--active" : ""}`}
            disabled={disabled}
            onClick={() => onChange(device.type)}
            role="radio"
            aria-checked={active}
          >
            <Icon aria-hidden="true" size={24} />
            {device.label}
          </button>
        );
      })}
    </div>
  );
}
