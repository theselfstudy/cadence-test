# Cadence — drive.file Scope Migration Plan

## Context
Google rejected the `https://www.googleapis.com/auth/spreadsheets` scope (sensitive, requires full verification + annual CASA security assessment).
Recommended alternative: `https://www.googleapis.com/auth/drive.file` — non-sensitive, no verification required.

**Testing happens in `cadence-drivefile`. The original `cadence/` repo is untouched.**
New GCP project is used for this test build (separate client ID, OAuth consent screen, etc.)

---

## How drive.file works
- App can only access files it created, OR files the user explicitly selected via Google Picker
- Sheets API read/write calls are unchanged — only the scope and file-access model change
- Sheet lives in user's Google Drive — they own it, can open it anytime

---

## Two-path onboarding model

### Path A — New Users
1. User signs in via Google OAuth (`drive.file` scope)
2. On first sync, Cadence **automatically creates** a new Google Sheet in their Drive
3. App stores the sheet ID (same as current behavior, just auto-generated)
4. A hyperlink to the sheet is shown persistently in the app (settings or dashboard)

### Path B — Existing Users (beta migration)
1. User signs in via Google OAuth (`drive.file` scope)
2. A **Google Picker** dialog appears — user selects their existing Cadence sheet
3. App stores the returned file ID and continues as normal
4. Picker uses `setFileIds(fileIds)` if ID is already known (pre-navigates to the file)

---

## Implementation Steps

### 1. Scope change
- [ ] `lib/oauthHelpers.ts` — change scope to `https://www.googleapis.com/auth/drive.file`

### 2. New User path (auto-create sheet)
- [ ] `lib/googleSheets.ts` — add `createCadenceSheet()` function using Sheets API `spreadsheets.create`
  - Create sheet with correct tab names and header rows
  - Return the new spreadsheet ID
- [ ] Settings/onboarding flow — remove "paste your sheet ID" field
- [ ] On first sync: if no sheet ID stored, call `createCadenceSheet()`, store ID, proceed with sync
- [ ] Add sheet hyperlink in UI (settings page or dashboard header)

### 3. Existing User path (Google Picker)
- [ ] Load Google Picker API script
- [ ] Build Picker with `ViewId.SPREADSHEETS` filter
- [ ] Use `setFileIds(fileIds)` if a sheet ID hint is available (e.g. user pastes it in manually as a fallback)
- [ ] On file select: store returned file ID, proceed with sync
- [ ] Wire into onboarding: offer "Create new sheet" vs "Select existing sheet" choice after OAuth

### 4. GCP project setup
- [ ] Create new GCP project for cadence-drivefile testing
- [ ] Add `drive.file` scope to OAuth consent screen
- [ ] Update client ID in `cadence-drivefile` constants
- [ ] Deploy test build via GitHub (new repo or branch)

### 5. Testing checklist
- [ ] New user: full flow, sheet auto-created, data syncs, hyperlink works
- [ ] Existing user: Picker appears, select existing sheet, data syncs correctly
- [ ] Picker pre-navigation works with known file ID
- [ ] Sheet hyperlink in app opens correct file
- [ ] OAuth token lifecycle unchanged (sessionStorage, cleared after sync)
- [ ] No regressions in anonymous mode

---

## Files that change (cadence-drivefile only)
| File | Change |
|------|--------|
| `lib/oauthHelpers.ts` | Scope → `drive.file` |
| `lib/googleSheets.ts` | Add `createCadenceSheet()` |
| `app/settings/page.tsx` | Remove sheet ID input, add Picker trigger |
| `components/welcome/ModeSelectionModal.tsx` | Possibly surface new/existing choice |
| New: `lib/googlePicker.ts` | Picker API wrapper |
| New: `components/SheetLink.tsx` | Persistent link to user's sheet |

---

## Reply to Google (when ready)
Once `drive.file` works end-to-end in cadence-drivefile:
- Reply to verification email with **"Confirming narrower scopes"**
- Update the scope in the **original GCP project** (do not remove previously approved scopes yet per their instructions)
- Point verification at the updated production app

---

## Status
- [x] Received Google scope rejection email (2026-06-11)
- [x] `cadence-drivefile` copy created
- [ ] New GCP project created
- [ ] Implementation started
