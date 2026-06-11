"use client";

import { useState } from "react";
import type { Medicine, MedicineCategory } from "@/types";
import { existsCaseInsensitive, findSimilarItems, isSimilar } from "@/lib/stringUtils";
import { SecureTextInput } from "@/components/ui/SecureInput";
import { containsFormulaInjection } from "@/lib/inputSecurity";

interface AddMedicineFormProps {
  onAdd: (medicine: Medicine) => void;
  availableCategories: { value: MedicineCategory; label: string; icon: string }[];
  currentMedicineCount: number;
  maxMedicines: number;
  existingMedicines: Medicine[];
  showValidationError?: boolean;
  /** Callback when medicine name validation state changes */
  onNameValidationChange?: (isValid: boolean) => void;
  /** Callback when dosage input validation state changes */
  onDosageValidationChange?: (isValid: boolean) => void;
  /** Callback when medicine name has formula injection */
  onNameFormulaInjectionChange?: (hasInjection: boolean) => void;
  /** Callback when dosage has formula injection */
  onDosageFormulaInjectionChange?: (hasInjection: boolean) => void;
}

export function AddMedicineForm({
  onAdd,
  availableCategories,
  currentMedicineCount,
  maxMedicines,
  existingMedicines,
  showValidationError = false,
  onNameValidationChange,
  onDosageValidationChange,
  onNameFormulaInjectionChange,
  onDosageFormulaInjectionChange,
}: AddMedicineFormProps) {
  const [name, setName] = useState("");
  const [dosageInput, setDosageInput] = useState("");
  const [dosages, setDosages] = useState<string[]>([]);
  const [categories, setCategories] = useState<MedicineCategory[]>([]);
  const [timeSensitive, setTimeSensitive] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<Medicine | null>(null);

  const canAddMore = currentMedicineCount < maxMedicines;
  const existingNames = existingMedicines.map((m) => m.name);

  const handleNameChange = (value: string) => {
    setName(value);
    setWarning(null);
    setShowDuplicatePrompt(false);
    setDuplicateMatch(null);

    // Check for formula injection
    const hasInjection = containsFormulaInjection(value);
    onNameFormulaInjectionChange?.(hasInjection);

    // Notify parent of validation state
    const isValid = value.length <= 60;
    onNameValidationChange?.(isValid);

    if (value.trim()) {
      const similar = findSimilarItems(value.trim(), existingNames);
      if (similar.length > 0 && !existsCaseInsensitive(value.trim(), existingNames)) {
        setWarning(`Did you mean "${similar[0]}"?`);
      }
    }
  };

  // Handle dosage input changes
  const handleDosageInputChange = (value: string) => {
    setDosageInput(value);

    // Check for formula injection
    const hasInjection = containsFormulaInjection(value);
    onDosageFormulaInjectionChange?.(hasInjection);

    // Notify parent of validation state
    const isValid = value.length <= 60;
    onDosageValidationChange?.(isValid);
  };

  // Add a dosage chip
  const handleAddDosage = () => {
    const trimmed = dosageInput.trim();
    if (!trimmed) return;
    
    // Check for duplicates (case-insensitive)
    if (dosages.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    
    setDosages([...dosages, trimmed]);
    setDosageInput("");
  };

  // Remove a dosage chip
  const handleRemoveDosage = (dosage: string) => {
    setDosages(dosages.filter(d => d !== dosage));
  };

  // Handle Enter key in dosage input
  const handleDosageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !containsFormulaInjection(dosageInput)) {
      e.preventDefault();
      handleAddDosage();
    }
  };

  const handleSubmit = () => {
    // Auto-add any pending dosage input before submitting
    const pendingDosage = dosageInput.trim();
    if (pendingDosage && !dosages.some(d => d.toLowerCase() === pendingDosage.toLowerCase())) {
      // Add the pending dosage to the list
      const updatedDosages = [...dosages, pendingDosage];
      setDosages(updatedDosages);
      setDosageInput("");

      // Continue with validation using the updated dosages
      // We need to use updatedDosages for the submission logic below
      if (!name.trim() || categories.length === 0 || !canAddMore) return;

      const trimmedName = name.trim();

      // Find any medicine with similar name
      const matchingMedicine = existingMedicines.find((m) =>
        isSimilar(m.name, trimmedName)
      );

      if (matchingMedicine) {
        // Check if exact same medicine
        const sameDosages = JSON.stringify([...updatedDosages].sort()) ===
                            JSON.stringify([...(matchingMedicine.dosages || [])].sort());

        if (sameDosages) {
          // Same name + same dosages: merge categories
          const mergedCategories = Array.from(
            new Set([...matchingMedicine.categories, ...categories])
          ) as MedicineCategory[];

          onAdd({
            ...matchingMedicine,
            categories: mergedCategories,
            timeSensitive: matchingMedicine.timeSensitive || timeSensitive,
          });

          resetForm();
          return;
        } else {
          // Same name but different dosages: prompt user
          setDuplicateMatch(matchingMedicine);
          setShowDuplicatePrompt(true);
          return;
        }
      }

      // Add new medicine with updated dosages
      onAdd({
        id: Date.now().toString(),
        name: trimmedName,
        dosages: updatedDosages,
        categories,
        timeSensitive,
      });
      resetForm();
      return;
    }

    // No pending dosage, proceed with normal validation
    if (!name.trim() || categories.length === 0 || !canAddMore) return;

    const trimmedName = name.trim();

    // Find any medicine with similar name
    const matchingMedicine = existingMedicines.find((m) => 
      isSimilar(m.name, trimmedName)
    );

    if (matchingMedicine) {
      // Check if exact same medicine
      const sameDosages = JSON.stringify([...dosages].sort()) === 
                          JSON.stringify([...(matchingMedicine.dosages || [])].sort());

      if (sameDosages) {
        // Same name + same dosages: merge categories
        const mergedCategories = Array.from(
          new Set([...matchingMedicine.categories, ...categories])
        ) as MedicineCategory[];

        onAdd({
          ...matchingMedicine,
          categories: mergedCategories,
          timeSensitive: matchingMedicine.timeSensitive || timeSensitive,
        });

        resetForm();
        return;
      } else {
        // Same name but different dosages: prompt user
        setDuplicateMatch(matchingMedicine);
        setShowDuplicatePrompt(true);
        return;
      }
    }

    addNewMedicine();
  };

  const addNewMedicine = () => {
    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      dosages: dosages,
      categories,
      timeSensitive,
    });
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setDosageInput("");
    setDosages([]);
    setCategories([]);
    setTimeSensitive(false);
    setWarning(null);
    setShowDuplicatePrompt(false);
    setDuplicateMatch(null);
  };

  const handleAddAsSeparate = () => {
    addNewMedicine();
  };

  const handleCancel = () => {
    setShowDuplicatePrompt(false);
    setDuplicateMatch(null);
  };

  const toggleCategory = (cat: MedicineCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  if (!canAddMore) {
    return (
      <p className="text-sm text-app-gray italic">
        Maximum of {maxMedicines} medicines reached.
      </p>
    );
  }

  // Duplicate prompt dialog
  if (showDuplicatePrompt && duplicateMatch) {
    return (
      <div className="p-4 bg-app-taupe/10 rounded-lg border border-app-taupe/30 space-y-4">
        <div>
          <p className="font-medium text-app-charcoal">Similar medicine found</p>
          <p className="text-sm text-app-gray mt-1">
            You already have <strong>&quot;{duplicateMatch.name}&quot;</strong>
            {duplicateMatch.dosages && duplicateMatch.dosages.length > 0 && (
              <span> with dosages: {duplicateMatch.dosages.join(", ")}</span>
            )}.
          </p>
          <p className="text-sm text-app-gray mt-1">
            You&apos;re trying to add <strong>&quot;{name.trim()}&quot;</strong>
            {dosages.length > 0 && <span> with dosages: {dosages.join(", ")}</span>}.
          </p>
        </div>
        <p className="text-sm text-app-charcoal">
          Would you like to add this as a separate medicine?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddAsSeparate}
            className="flex-1 px-4 py-2 rounded-lg bg-app-taupe text-white font-medium hover:opacity-90"
          >
            Yes, Add Separately
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 rounded-lg bg-app-cream text-app-charcoal border border-app-border hover:bg-app-border"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Medicine Name */}
      <div>
        <SecureTextInput
          value={name}
          onChange={handleNameChange}
          label={showValidationError ? "Medicine Name * (Required)" : "Medicine Name"}
          placeholder="e.g., Ibuprofen, Metamucil, Spironolactone..."
          required={true}
          showCharCount={true}
        />
        {warning && (
          <p className="text-xs text-app-taupe mt-1">{warning}</p>
        )}
      </div>

      {/* Dosage Options - Chip Based */}
      <div>
        <label className="block text-sm text-app-gray mb-1">
          Dosage Options (optional)
        </label>
        <p className="text-xs text-app-gray mb-2">
          Add one or more dosage options you typically take
        </p>
        
        {/* Dosage Chips */}
        {dosages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {dosages.map((dosage) => (
              <span
                key={dosage}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-app-taupe/20 text-app-charcoal"
              >
                {dosage}
                <button
                  type="button"
                  onClick={() => handleRemoveDosage(dosage)}
                  className="ml-1 text-app-gray hover:text-app-red transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        
        {/* Dosage Input */}
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <SecureTextInput
              value={dosageInput}
              onChange={handleDosageInputChange}
              onKeyDown={handleDosageKeyDown}
              placeholder="e.g., 200mg, 2 pills, 1000IUs..."
              showCharCount={true}
              className="w-full"
            />
          </div>
          <button
            type="button"
            onClick={handleAddDosage}
            disabled={!dosageInput.trim() || dosageInput.length > 60 || containsFormulaInjection(dosageInput)}
            className="px-4 py-2 rounded-lg bg-app-taupe/20 text-app-charcoal font-medium hover:bg-app-taupe/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={`block text-sm mb-2 ${
          showValidationError ? "text-app-red font-medium" : "text-app-gray"
        }`}>
          Add at least one tag *
        </label>        
        {availableCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  categories.includes(cat.value)
                    ? "bg-app-green/70 text-white"
                    : "bg-app-cream text-app-charcoal border border-app-border hover:border-app-green/40"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-app-gray italic">
            Enable Bowel Tracking or Period Tracking to add category-specific medicines.
          </p>
        )}
      </div>

      {/* Time Sensitive Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setTimeSensitive(!timeSensitive)}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            timeSensitive ? "bg-app-green/60" : "bg-app-border"
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              timeSensitive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium text-app-charcoal">Time-sensitive Medication</p>
          <p className="text-xs text-app-gray">Require time when logging this medicine</p>
        </div>
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || name.length > 60 || categories.length === 0 || containsFormulaInjection(name) || containsFormulaInjection(dosageInput)}
        className="w-full px-6 py-2 rounded-lg bg-app-green/60 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Add Medicine ({currentMedicineCount}/{maxMedicines})
      </button>
    </div>
  );
}