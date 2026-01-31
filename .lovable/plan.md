
# Fix: AI Research Dialog Showing Stale Data

## Problem Identified
When navigating between contacts using the Previous/Next arrows, the AI Research dialog shows the previous contact's research data instead of fetching fresh data for the new contact.

**Root Cause**: In `CompanyResearchDialog.tsx`, the `researchData` state is not reset when the `companyName` or `contactId` props change. The `useEffect` that triggers research only runs when `isOpen` changes, and it skips fetching if `researchData` already exists.

## Solution

Update `CompanyResearchDialog.tsx` to reset the `researchData` state whenever the company context changes (i.e., when `companyName` or `contactId` props change).

### Changes to `src/components/CompanyResearchDialog.tsx`

1. **Add a new `useEffect`** that resets `researchData` to `null` whenever `companyName` or `contactId` changes
2. **Update the existing `useEffect`** to include `companyName` in its dependency array to properly trigger research when the company changes

```typescript
// Add this effect to reset data when company changes
useEffect(() => {
  // Reset research data when the company context changes
  setResearchData(null);
}, [companyName, contactId]);

// Update existing effect to include companyName in dependencies
useEffect(() => {
  if (isOpen && !researchData && !isResearching) {
    handleResearch();
  }
}, [isOpen, companyName]); // Added companyName to dependencies
```

## Why This Works
- When the user navigates to a different contact, `companyName` and `contactId` change
- The first `useEffect` detects this change and resets `researchData` to `null`
- When the user clicks "AI Research", the dialog opens (`isOpen` becomes true)
- The second `useEffect` sees that `researchData` is `null` and triggers a fresh research call

---

## Technical Details

**File**: `src/components/CompanyResearchDialog.tsx`

**Current Code (lines 166-171)**:
```typescript
// Trigger research when dialog opens
useEffect(() => {
  if (isOpen && !researchData && !isResearching) {
    handleResearch();
  }
}, [isOpen]);
```

**Updated Code**:
```typescript
// Reset research data when company changes (for contact navigation)
useEffect(() => {
  setResearchData(null);
}, [companyName, contactId]);

// Trigger research when dialog opens (with fresh state)
useEffect(() => {
  if (isOpen && !researchData && !isResearching) {
    handleResearch();
  }
}, [isOpen, companyName]);
```

This is a minimal, targeted fix that addresses the caching issue without affecting any other functionality.
