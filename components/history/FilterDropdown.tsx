"use client";

import { useEffect, useRef } from "react";

interface FilterOption {
  value: string;
  label: string;
  selected: boolean;
}

interface FilterSection {
  title: string;
  options: FilterOption[];
  onToggle: (value: string) => void;
}

interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  sections: FilterSection[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClearCategory: () => void;
  onSelectAll: () => void;
  categoryCount: number;
}

export function FilterDropdown({
  isOpen,
  onClose,
  sections,
  triggerRef,
  onClearCategory,
  onSelectAll,
  categoryCount,
}: FilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  // Check if there are any options at all
  const hasAnyOptions = sections.some(section => section.options.length > 0);
  const hasSelections = categoryCount > 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 z-50 min-w-[240px] max-w-[320px]
                 bg-white rounded-lg shadow-lg border border-app-border
                 animate-in fade-in slide-in-from-top-1 duration-150"
      role="listbox"
      aria-multiselectable="true"
    >
      {/* Header with Select All / Clear All toggle */}
      {hasAnyOptions && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-app-border">
          <span className="text-xs text-app-gray">
            {categoryCount} selected
          </span>
          <button
            onClick={hasSelections ? onClearCategory : onSelectAll}
            className={`text-xs font-medium transition-colors ${
              hasSelections 
                ? "text-app-red hover:text-app-red/80" 
                : "text-app-teal hover:text-app-teal/80"
            }`}
          >
            {hasSelections ? "Clear All" : "Select All"}
          </button>
        </div>
      )}

      {/* Options */}
      <div className="max-h-[280px] overflow-y-auto p-1">
        {!hasAnyOptions ? (
          <div className="px-3 py-4 text-center text-sm text-app-gray">
            No options available in selected date range
          </div>
        ) : (
          sections.map((section, sectionIndex) => {
            if (section.options.length === 0) return null;

            return (
              <div key={section.title}>
                {/* Section title (if multiple sections) */}
                {sections.filter(s => s.options.length > 0).length > 1 && (
                  <div className="px-2 py-1.5 text-xs font-medium text-app-gray uppercase tracking-wide">
                    {section.title}
                  </div>
                )}

                {/* Options */}
                {section.options.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                      transition-colors hover:bg-app-cream
                      ${option.selected ? "bg-app-teal/5" : ""}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={option.selected}
                      onChange={() => section.onToggle(option.value)}
                      className="w-4 h-4 rounded border-app-border text-app-teal 
                                 focus:ring-app-teal focus:ring-offset-0"
                    />
                    <span
                      className={`text-sm ${
                        option.selected ? "text-app-teal font-medium" : "text-app-charcoal"
                      }`}
                    >
                      {option.label}
                    </span>
                  </label>
                ))}

                {/* Divider between sections */}
                {sectionIndex < sections.length - 1 &&
                  sections[sectionIndex + 1]?.options.length > 0 && (
                    <div className="my-1 border-t border-app-border" />
                  )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}