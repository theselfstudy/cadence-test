"use client";

import { useState } from "react";
import type { Medicine, MedicineCategory } from "@/types";
import { MEDICINE_CATEGORIES } from "@/lib/constants";
import { SecureTextInput } from "@/components/ui/SecureInput";

interface MedicineItemProps {
  medicine: Medicine;
  onRemove: () => void;
  onUpdate: (updated: Partial<Medicine>) => void;
  availableCategories?: { value: MedicineCategory; label: string; icon: string }[];
}

export function MedicineItem({ 
  medicine, 
  onRemove, 
  onUpdate,
  availableCategories = MEDICINE_CATEGORIES,
}: MedicineItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState(medicine.name);
  const [editDosages, setEditDosages] = useState<string[]>(medicine.dosages || []);
  const [editDosageInput, setEditDosageInput] = useState("");
  const [editCategories, setEditCategories] = useState<MedicineCategory[]>(medicine.categories);
  const [editTimeSensitive, setEditTimeSensitive] = useState(medicine.timeSensitive);

  // Color mapping for medicine tags
  const tagColors: Record<MedicineCategory, string> = {
    bowel: "bg-app-plumb/20 text-app-plumb",
    symptom: "bg-app-teal/20 text-app-teal",
    period: "bg-app-red/20 text-app-red",
    other: "bg-app-taupe/30 text-app-charcoal",
  };

  // Handle removing a dosage in view mode
  const handleRemoveDosage = (dosage: string) => {
    const updatedDosages = (medicine.dosages || []).filter(d => d !== dosage);
    onUpdate({ dosages: updatedDosages });
  };

  // Handle adding a dosage in edit mode
  const handleAddEditDosage = () => {
    const trimmed = editDosageInput.trim();
    if (!trimmed) return;
    
    if (editDosages.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      return; // Duplicate
    }
    
    setEditDosages([...editDosages, trimmed]);
    setEditDosageInput("");
  };

  // Handle removing a dosage in edit mode
  const handleRemoveEditDosage = (dosage: string) => {
    setEditDosages(editDosages.filter(d => d !== dosage));
  };

  // Handle Enter key in dosage input
  const handleDosageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEditDosage();
    }
  };

  // Toggle category in edit mode
  const toggleEditCategory = (cat: MedicineCategory) => {
    setEditCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Start editing - copy current values to edit state
  const handleStartEdit = () => {
    setEditName(medicine.name);
    setEditDosages(medicine.dosages || []);
    setEditDosageInput("");
    setEditCategories(medicine.categories);
    setEditTimeSensitive(medicine.timeSensitive);
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original values
    setEditName(medicine.name);
    setEditDosages(medicine.dosages || []);
    setEditDosageInput("");
    setEditCategories(medicine.categories);
    setEditTimeSensitive(medicine.timeSensitive);
  };

  // Save changes
  const handleSave = () => {
    if (!editName.trim() || editCategories.length === 0) {
      return; // Validation failed
    }

    onUpdate({
      name: editName.trim(),
      dosages: editDosages,
      categories: editCategories,
      timeSensitive: editTimeSensitive,
    });
    
    setIsEditing(false);
  };

  // ─────────────────────────────────────────
  // EDIT MODE
  // ─────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="p-4 bg-app-cream rounded-lg border-2 border-app-taupe/50 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-app-charcoal">Edit Medicine</span>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-xs text-app-gray hover:text-app-charcoal"
          >
            Cancel
          </button>
        </div>

        {/* Medicine Name */}
        <div>
          <SecureTextInput
            value={editName}
            onChange={setEditName}
            label="Medicine Name *"
            placeholder="e.g., Ibuprofen, Metamucil, Spironolactone..."
            required={true}
            showCharCount={true}
          />
        </div>

        {/* Dosages */}
        <div>
          <label className="block text-xs text-app-gray mb-1">
            Dosage Options
          </label>
          
          {/* Existing dosage chips */}
          {editDosages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {editDosages.map((dosage) => (
                <span
                  key={dosage}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-app-taupe/20 text-app-charcoal"
                >
                  {dosage}
                  <button
                    type="button"
                    onClick={() => handleRemoveEditDosage(dosage)}
                    className="ml-1 text-app-gray hover:text-app-red transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Add new dosage */}
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <SecureTextInput
                value={editDosageInput}
                onChange={setEditDosageInput}
                placeholder="e.g., 200mg, 2 pills, 1000IUs..."
                showCharCount={true}
                className="text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddEditDosage}
              disabled={!editDosageInput.trim() || editDosageInput.length > 60}
              className="px-3 py-1.5 rounded-lg bg-app-taupe/20 text-app-charcoal text-sm font-medium hover:bg-app-taupe/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Categories/Tags */}
        <div>
          <label className="block text-xs text-app-gray mb-2">
            Tags * (select at least one)
          </label>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleEditCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  editCategories.includes(cat.value)
                    ? "bg-app-green/70 text-white"
                    : "bg-app-white text-app-charcoal border border-app-border hover:border-app-green/40"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Sensitive Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditTimeSensitive(!editTimeSensitive)}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              editTimeSensitive ? "bg-app-green/60" : "bg-app-border"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                editTimeSensitive ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <div>
            <p className="text-xs font-medium text-app-charcoal">Time-sensitive</p>
            <p className="text-[10px] text-app-gray">Require time when logging</p>
          </div>
        </div>

        {/* Save / Cancel Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!editName.trim() || editName.length > 60 || editCategories.length === 0}
            className="flex-1 px-4 py-2 rounded-lg bg-app-green/70 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="px-4 py-2 rounded-lg bg-app-white text-app-charcoal border border-app-border hover:bg-app-border text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // VIEW MODE
  // ─────────────────────────────────────────
  return (
    <div className="p-3 bg-app-cream rounded-lg border border-app-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Name and Time-sensitive badge */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-app-charcoal">{medicine.name}</span>
            {medicine.timeSensitive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-app-taupe/20 text-app-taupe">
                ⏰ Time-sensitive
              </span>
            )}
          </div>
          
          {/* Dosage Chips */}
          {medicine.dosages && medicine.dosages.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {medicine.dosages.map((dosage) => (
                <span
                  key={dosage}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-app-white border border-app-border text-app-charcoal"
                >
                  {dosage}
                  <button
                    type="button"
                    onClick={() => handleRemoveDosage(dosage)}
                    className="text-app-gray hover:text-app-red transition-colors"
                    title={`Remove ${dosage}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Category Tags */}
          <div className="flex flex-wrap gap-1">
            {medicine.categories.map((cat) => (
              <span
                key={cat}
                className={`text-xs px-2 py-0.5 rounded-full ${tagColors[cat]}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </span>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleStartEdit}
            className="p-1.5 text-app-gray hover:text-app-teal transition-colors rounded hover:bg-app-teal/10"
            title="Edit medicine"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-app-gray hover:text-app-red transition-colors rounded hover:bg-app-red/10"
            title="Remove medicine"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}