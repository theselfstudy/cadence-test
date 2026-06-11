"use client";

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: string;
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  activeColor = "bg-app-green",
}: ToggleRowProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <p className="font-medium text-app-charcoal">{label}</p>
        <p className="text-sm text-app-gray">{description}</p>
      </div>
      <div className="w-12 flex-none">
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            checked ? activeColor : "bg-app-border"
          }`}
          role="switch"
          aria-checked={checked}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}