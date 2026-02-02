

# Make Send Report Dialogs Identical

## Problem

The two "Send Report" dialogs have significant differences that cause confusion:

| Feature | Dashboard (Quick Send) | CustomerDashboard |
|---------|----------------------|-------------------|
| Dialog title | "Send Report" | "Email Preview" |
| Message field | Inside dialog, mandatory with asterisk | Outside dialog in collapsible panel |
| Primary recipient | Editable input field | Non-editable badge |
| Add button | Icon only (+) | Text button "+ Add" |
| Preview | Simple text summary | Full HTML email preview |
| Send button | "Send Report" | "Send to X recipient(s)" |

## Solution

Standardize both dialogs to use the CustomerDashboard design (with Email Preview), but incorporate the mandatory message requirement. This gives users the best experience:
- Full preview of what will be sent
- Mandatory message field inside the dialog
- Consistent styling and layout

---

## Target Design (Both Dialogs Will Have)

```
+------------------------------------------+
|  Email Preview                        X  |
+------------------------------------------+
|  Recipients                              |
|  [user@example.com] (primary)            |
|  [extra@email.com] [X]                   |
|  [Add emails (comma-separated)...] [+Add]|
+------------------------------------------+
|  Subject                                 |
|  [________________________________]      |
+------------------------------------------+
|  Add message to report *                 |
|  [________________________________]      |
|  [________________________________]      |
+------------------------------------------+
|  Preview:                                |
|  +------------------------------------+  |
|  |  (Full HTML email preview)         |  |
|  |                                    |  |
|  +------------------------------------+  |
+------------------------------------------+
|  [Cancel]           [Send to X recipients]|
+------------------------------------------+
```

---

## Technical Changes

### File: `src/pages/Dashboard.tsx`

1. **Change dialog title** from "Send Report" to "Email Preview"

2. **Add email preview HTML generation** - copy `generatePreviewHtml()` function from CustomerDashboard

3. **Restructure dialog content**:
   - Recipients section with badges (primary not editable in this context since it comes from card)
   - Subject section
   - Mandatory message field with asterisk
   - ScrollArea with full HTML preview

4. **Update dialog size** from `max-w-md` to `max-w-4xl max-h-[90vh] flex flex-col`

5. **Update send button** to show recipient count: "Send to X recipient(s)"

### File: `src/pages/CustomerDashboard.tsx`

1. **Move message field into dialog** - remove the external Collapsible panel and add the message Textarea inside the dialog (between Subject and Preview sections)

2. **Make message mandatory** - add asterisk indicator and validation

3. **Update handleSendEmail** to validate message is not empty (matching Dashboard behavior)

4. **Remove the external Collapsible Card** for the message (lines 560-591)

---

## Detailed Changes

### Dashboard.tsx Dialog Updates

Current structure (lines 529-656):
- DialogContent max-w-md
- Company name text
- Subject input
- Message textarea (mandatory)
- Recipients with editable primary
- Summary text

New structure:
- DialogContent max-w-4xl with flex column
- Recipients section with badges
- Subject input
- Message textarea (mandatory)
- ScrollArea with HTML preview
- "Send to X recipients" button

### CustomerDashboard.tsx Dialog Updates

1. Remove external Collapsible message panel (lines 560-591)

2. Add message field inside dialog between Subject and Preview:
```tsx
{/* Message Section - Mandatory */}
<div className="border rounded-lg p-4 bg-muted/30">
  <label className="text-sm font-medium mb-2 block">
    Add message to report <span className="text-destructive">*</span>
  </label>
  <Textarea
    value={customMessage}
    onChange={(e) => setCustomMessage(e.target.value)}
    placeholder="Add a personalized message to include at the top of the report..."
    rows={3}
    required
  />
</div>
```

3. Add validation in handleSendEmail:
```tsx
if (!customMessage.trim()) {
  toast.error("Please add a message to the report");
  return;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Redesign dialog to match CustomerDashboard with preview, update title, add HTML preview generation, change button text |
| `src/pages/CustomerDashboard.tsx` | Move message field into dialog, make it mandatory, remove external collapsible panel, add validation |

---

## Benefits

1. **Consistency** - Users see the same interface regardless of which dialog they open
2. **Preview** - Both dialogs show exactly what will be sent
3. **Mandatory message** - Enforced in both places per business requirement
4. **Recipient visibility** - Clear display of who will receive the email

