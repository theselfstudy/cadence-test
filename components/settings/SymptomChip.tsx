"use client";

interface SymptomChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  removable?: boolean;
}

export function SymptomChip({ label, selected, onToggle, onRemove, removable }: SymptomChipProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
        selected
          ? "bg-app-teal text-white opacity-100 hover:opacity-70 transition-colors duration-200"
          : "bg-app-teal/15 text-app-gray/50 hover:bg-app-teal hover:opacity-50 hover:text-white transition-colors duration-200"
      }`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
    >
      {label}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-app-red"
        >
          ×
        </button>
      )}
    </div>
  );
}