"use client";

import { useSettings } from "@/stores/useSettings";
import Link from "next/link";
import { useState } from 'react';

const CloudIcon = () => <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
const UserIcon = () => <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

export default function SettingsOverviewPage() {
  const { 
    setupComplete, 
    symptoms, 
    periodTracking,
    timeFormat,
    googleSheet,
    stoolTracking,
    medicineTracking,
    isGoogleSheetConnected,
  } = useSettings();

  let mode = "Anonymous Mode";
  let modeIcon = <UserIcon />;
  let modeColorClass = "text-app-gray";
  let modeDescription = "Data stored locally on this device only";

  if (isGoogleSheetConnected) {
    mode = "Signed In & Synced";
    modeIcon = <CloudIcon />;
    modeColorClass = "text-app-green";
    modeDescription = "Data syncs to your Google Sheet";
  }

  const [showColorPalette, setShowColorPalette] = useState(false);

  // Safe access to googleSheet with defaults
  const safeGoogleSheet = googleSheet ?? {
    url: null,
    name: null,
    addedAt: null,
  };

  // Safe access to other settings
  const safePeriodTracking = periodTracking ?? {
    enabled: false,
    trackFlow: false,
    periodSymptoms: [],
    customPeriodSymptoms: [],
    productTracking: { enabled: false, selectedProducts: [], customProducts: {} },
  };
  
  const safeStoolTracking = stoolTracking ?? { enabled: false };
  const safeMedicineTracking = medicineTracking ?? { enabled: false, medicines: [] };

  // Check if period tracking is enabled
  const isPeriodTrackingEnabled = safePeriodTracking.enabled ?? false;
  
  // Check if medicine tracking is enabled
  const isMedicineTrackingEnabled = safeMedicineTracking.enabled && safeMedicineTracking.medicines.length > 0;

  // Custom symptoms lists
  const generalCustom = symptoms?.custom || [];
  const periodCustom = isPeriodTrackingEnabled 
    ? (safePeriodTracking.customPeriodSymptoms || []) 
    : [];
  const allCustomSymptoms = [...new Set([...generalCustom, ...periodCustom])];

  // Selected (non-custom) symptoms - filter out ALL custom symptoms
  const generalSelectedNonCustom = (symptoms?.selected || []).filter(
    (s) => !allCustomSymptoms.includes(s)
  );
  const periodSelectedNonCustom = isPeriodTrackingEnabled
    ? (safePeriodTracking.periodSymptoms || []).filter(
        (s) => !allCustomSymptoms.includes(s)
      )
    : [];
  const allSelectedSymptoms = [...new Set([...generalSelectedNonCustom, ...periodSelectedNonCustom])];

  // Helper functions for colors
  const getSelectedSymptomColor = (symptom: string) => {
    const isGeneral = generalSelectedNonCustom.includes(symptom);
    const isPeriod = isPeriodTrackingEnabled && periodSelectedNonCustom.includes(symptom);
    
    if (isGeneral && isPeriod) return "bg-app-green";
    if (isPeriod) return "bg-app-red";
    return "bg-app-teal";
  };

  const getCustomSymptomColor = (symptom: string) => {
    const isGeneralCustom = generalCustom.includes(symptom);
    const isPeriodCustom = periodCustom.includes(symptom);
    const isSelectedAsPeriod = isPeriodTrackingEnabled && (safePeriodTracking.periodSymptoms || []).includes(symptom);
    
    const isGeneral = isGeneralCustom;
    const isPeriod = isPeriodCustom || isSelectedAsPeriod;
    
    if (isGeneral && isPeriod) return "bg-app-green";
    if (isPeriod) return "bg-app-red";
    return "bg-app-teal";
  };

  // Count total products selected
  const totalProductsSelected = safePeriodTracking.productTracking?.selectedProducts?.length ?? 0;
  
  // Count medicines
  const totalMedicines = safeMedicineTracking.medicines.length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <section className="card">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard" className="text-app-gray hover:text-app-charcoal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-app-charcoal">
            At a Glance
          </h1>
        </div>
        <p className="text-app-gray">
          Your current settings configuration at a glance
        </p>

        <div className="mt-4 p-3 bg-app-cream rounded-lg border border-app-border">
          <div className="flex items-center gap-3">
            <div className={modeColorClass}>{modeIcon}</div>
            <div>
              <p className={`font-semibold ${modeColorClass}`}>{mode}</p>
              <p className="text-xs text-app-gray">{modeDescription}</p>
              <p className="text-xs text-app-gray mt-1">
                <Link href="/settings" className="underline hover:text-app-green">
                  Change in Settings
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          <Link
            href="/entry"
            className="inline-flex items-center gap-2 px-6 py-3 bg-app-green text-white font-medium rounded-lg hover:bg-app-green-dark transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Entry
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-app-cream text-app-charcoal font-medium rounded-lg border border-app-border hover:bg-app-border transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Edit Settings
          </Link>
        </div>
      </section>

      {/* Google Sheet Status */}
      <section className="card">
        <h2 className="text-lg font-semibold text-app-charcoal mb-4">
          📊 Google Sheet
        </h2>
        {safeGoogleSheet.url ? (
          <div className="p-4 bg-app-cream rounded-lg border border-app-border">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-app-teal rounded-full flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-app-charcoal">
                  {safeGoogleSheet.name || "Connected Sheet"}
                </p>
                <a
                  href={safeGoogleSheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-app-green hover:text-app-green-dark underline underline-offset-2 truncate block"
                >
                  Open in Google Sheets ↗
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-app-cream rounded-lg border border-app-border">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-app-gray rounded-full flex-shrink-0" />
              <div>
                <p className="font-medium text-app-charcoal">No sheet connected</p>
                <p className="text-sm text-app-gray">
                  Connect a Google Sheet to sync and backup your data.
                </p>
                <p className="text-sm mt-4">
                  <Link href="/recover" className="text-app-green hover:underline">
                    On a new device? Click here to restore your settings.
                  </Link>
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-app-green text-white text-sm font-medium hover:bg-app-green-dark transition-colors"
            >
              Connect Sheet
            </Link>
          </div>
        )}
      </section>

      {/* Settings at a Glance */}
      <section className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-app-charcoal">
            ⚙️ At a Glance
          </h2>
          <Link 
            href="/settings" 
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-app-green text-white text-sm font-medium hover:bg-app-green-dark transition-colors"
          >
            Change in Settings
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <CountStatCard
            label="Symptoms"
            count={allSelectedSymptoms.length}
            color="teal"
          />
          <CountStatCard
            label="Custom"
            count={allCustomSymptoms.length}
            color="green"
          />
          {isPeriodTrackingEnabled && (
            <CountStatCard
              label="Period"
              count={safePeriodTracking.periodSymptoms?.length ?? 0}
              color="red"
            />
          )}
          {isPeriodTrackingEnabled && safePeriodTracking.productTracking?.enabled && (
            <CountStatCard
              label="Products"
              count={totalProductsSelected}
              color="red"
            />
          )}
          {isMedicineTrackingEnabled && (
            <CountStatCard
              label="Medicines"
              count={totalMedicines}
              color="lightgreen"
            />
          )}
        </div>

        {/* Enabled Features Pills */}
        <div className="mb-6">
          <p className="text-sm text-app-gray mb-2">Active Features:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <FeaturePill 
              label={timeFormat === "12h" ? "12-Hour" : "24-Hour"} 
              isEnabled={true} 
              color="green"
            />
            <FeaturePill 
              label="Bowel" 
              isEnabled={safeStoolTracking.enabled} 
              color="plumb"
            />
            <FeaturePill 
              label="Intensity" 
              isEnabled={symptoms?.intensityTracking?.enabled ?? false} 
              color="teal"
            />
            {isPeriodTrackingEnabled && (
              <>
                <FeaturePill 
                  label="Period" 
                  isEnabled={true} 
                  color="red"
                />
                <FeaturePill 
                  label="Flow" 
                  isEnabled={safePeriodTracking.trackFlow ?? false} 
                  color="red"
                />
                <FeaturePill 
                  label="Product" 
                  isEnabled={safePeriodTracking.productTracking?.enabled ?? false} 
                  color="red"
                />
              </>
            )}
            {isMedicineTrackingEnabled && (
              <FeaturePill 
                label={`Medicine (${totalMedicines})`}
                isEnabled={true} 
                color="lightgreen"
              />
            )}
          </div>
        </div>

        {/* Color Legend */}
        <div className="mb-6 p-3 bg-app-cream rounded-lg">
          <p className="text-sm text-app-gray mb-2 font-medium">Legend:</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-app-teal"></span>
              <span className="text-sm text-app-charcoal">General</span>
            </div>
            {isPeriodTrackingEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-app-red"></span>
                  <span className="text-sm text-app-charcoal">Period</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-app-green"></span>
                  <span className="text-sm text-app-charcoal">Both</span>
                </div>
              </>
            )}
            {isMedicineTrackingEnabled && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-app-green/30"></span>
                <span className="text-sm text-app-charcoal">Medicine</span>
              </div>
            )}
          </div>
        </div>

        {/* Selected Symptoms (Non-Custom) */}
        <div className="mb-6">
          <p className="text-sm text-app-gray mb-2">Total Selected Symptoms:</p>
          {allSelectedSymptoms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allSelectedSymptoms.map((symptom) => (
                <span
                  key={symptom}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium text-white ${getSelectedSymptomColor(symptom)}`}
                >
                  {symptom}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-app-gray italic">No symptoms selected</p>
          )}
        </div>

        {/* Custom Symptoms */}
        {allCustomSymptoms.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-app-gray mb-2">Total Custom Symptoms:</p>
            <div className="flex flex-wrap gap-2">
              {allCustomSymptoms.map((symptom) => (
                <span
                  key={`custom-${symptom}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium text-white ${getCustomSymptomColor(symptom)}`}
                >
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Products Selected - Only if enabled */}
        {isPeriodTrackingEnabled && safePeriodTracking.productTracking?.enabled && (
          <div className="mb-6">
            <p className="text-sm text-app-gray mb-2">Products Tracked:</p>
            {totalProductsSelected > 0 ? (
              <div className="flex flex-wrap gap-2">
                {safePeriodTracking.productTracking.selectedProducts?.map((productType) => (
                  <span
                    key={productType}
                    className="px-3 py-1.5 rounded-full text-sm font-medium text-white bg-app-red"
                  >
                    {productType.charAt(0).toUpperCase() + productType.slice(1).replace('-', ' ')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-app-gray italic">No products selected</p>
            )}
          </div>
        )}

        {/* Medicines - Only if enabled */}
        {isMedicineTrackingEnabled && (
          <div>
            <p className="text-sm text-app-gray mb-2">Medicines Tracked:</p>
            <div className="flex flex-wrap gap-2">
              {safeMedicineTracking.medicines.map((medicine) => (
                <span
                  key={medicine.id}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-charcoal bg-app-green/30"
                >
                  {medicine.name}
                  {medicine.dosages && (
                    <span className="ml-1 opacity-80">({medicine.dosages})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Color Palette Preview (Collapsible) */}
      {/* <section className="card">
        <button
          onClick={() => setShowColorPalette(!showColorPalette)}
          className="w-full flex justify-between items-center"
        >
          <h2 className="text-lg font-semibold text-app-charcoal">
            🎨 Color Palette Preview
          </h2>
          <span className="text-app-gray text-xl">
            {showColorPalette ? "−" : "+"}
          </span>
        </button>
        
        {showColorPalette && (
          <div className="mt-4">
            <div className="grid grid-cols-5 gap-2">
              <ColorSwatch color="bg-app-green" label="Primary Green" />
              <ColorSwatch color="bg-app-green-dark" label="Dark Green" />
              <ColorSwatch color="bg-app-taupe" label="Taupe" />
              <ColorSwatch color="bg-app-red" label="Red" />
              <ColorSwatch color="bg-app-teal" label="Teal" />
            </div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              <ColorSwatch color="bg-app-cream" label="Cream" />
              <ColorSwatch color="bg-app-white" label="White" />
              <ColorSwatch color="bg-app-charcoal" label="Charcoal" />
              <ColorSwatch color="bg-app-gray" label="Gray" />
              <ColorSwatch color="bg-app-border" label="Border" />
            </div>
          </div>
        )}
      </section> */}
    </div>
  );
}

// ========================
// Helper Components
// ========================

interface CountStatCardProps {
  label: string;
  count: number;
  color: "green" | "teal" | "red" | "taupe" | "lightgreen";
}

function CountStatCard({ label, count, color }: CountStatCardProps) {
  const colorClasses = {
    green: "text-app-green",
    teal: "text-app-teal",
    red: "text-app-red",
    taupe: "text-app-taupe",
    lightgreen: "text-app-green/50",
  };

  return (
    <div className="card py-3 px-3 text-center">
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{count}</p>
      <p className="text-xs text-app-gray leading-tight">{label}</p>
    </div>
  );
}

interface ColorSwatchProps {
  color: string;
  label: string;
}

function ColorSwatch({ color, label }: ColorSwatchProps) {
  return (
    <div className="text-center">
      <div className={`w-full aspect-square rounded-lg ${color} mb-1`} />
      <p className="text-xs text-app-gray">{label}</p>
    </div>
  );
}

interface FeaturePillProps {
  label: string;
  isEnabled: boolean;
  color?: "green" | "teal" | "red" | "plumb" | "taupe" | "lightgreen"; 
}

function FeaturePill({ label, isEnabled, color = "green" }: FeaturePillProps) {
  if (!isEnabled) return null;

  const colorClasses = {
    green: "bg-app-green/20 text-app-green border-app-green/30",
    teal: "bg-app-teal/10 text-app-teal border-app-teal/20",
    red: "bg-app-red/10 text-app-red border-app-red/20",
    plumb: "bg-app-plumb/10 text-app-plumb border-app-plumb/20",
    taupe: "bg-app-taupe/10 text-app-taupe border-app-taupe/20",
    lightgreen: "bg-app-green/10 text-app-green/70 border-app-green/20",
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border flex-shrink-0 ${colorClasses[color]}`}>
      <svg 
        className="w-3.5 h-3.5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      {label}
    </span>
  );
}
