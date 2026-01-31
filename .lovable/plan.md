
# Keep Contact Page Editable While Research Panel is Open

## Problem

The current Sheet component includes a `SheetOverlay` with `bg-black/80` that creates a dark overlay covering the entire page when the Company Research panel opens. This blocks all interaction with the Contact Interactions page behind it, preventing users from editing contact details, adding interactions, or navigating while researching.

## Solution

Modify the Sheet component to support a "non-modal" mode where the overlay is transparent and doesn't block pointer events. This allows the research panel to exist side-by-side with the contact page, with both remaining interactive.

---

## Layout Goal

```
Desktop (side-by-side, both interactive):
+----------------------------------+---------------------------+
|    Contact Interactions Page     |   Company Research Panel  |
|    (fully interactive)           |   (slide-in sheet)        |
|                                  |                           |
|  - Edit status                   |  - Research Brief         |
|  - Add interactions              |  - Chat messages          |
|  - Delete interactions           |  - Quick actions          |
|  - Navigate contacts             |  - Input field            |
+----------------------------------+---------------------------+

Mobile (toggleable full-screen panels):
- When research panel is open, it covers the contact page
- User can close panel to return to contact page
```

---

## Technical Implementation

### Option 1: Create a Non-Modal Sheet Variant (Recommended)

Add an optional `modal` prop to the SheetContent that controls whether the overlay blocks interaction.

**File: `src/components/ui/sheet.tsx`**

1. Add `modal` prop to SheetContent interface
2. Make overlay transparent and non-blocking when `modal={false}`
3. Keep the panel positioned correctly on the right side

Changes:
- Accept `modal?: boolean` prop (default: true for backward compatibility)
- When `modal={false}`:
  - Remove or make overlay transparent (`bg-transparent pointer-events-none`)
  - Sheet content remains interactive

### Option 2: Use the modal prop from Radix

Radix Dialog (which Sheet is built on) has a `modal` prop that controls whether the dialog is modal. When `modal={false}`:
- The overlay doesn't trap focus
- Clicking outside doesn't close the dialog
- Background remains interactive

---

## Detailed Changes

### File: `src/components/ui/sheet.tsx`

1. Add `modal` prop to Sheet (passed to SheetPrimitive.Root)
2. Make overlay conditional based on modal prop
3. Adjust pointer events for non-modal mode

```typescript
// Updated Sheet to accept modal prop
const Sheet = ({ modal = true, ...props }) => (
  <SheetPrimitive.Root modal={modal} {...props} />
);

// Updated SheetContent to conditionally render overlay
interface SheetContentProps ... {
  showOverlay?: boolean;
}

const SheetContent = React.forwardRef<...>(
  ({ side = "right", className, children, showOverlay = true, ...props }, ref) => (
    <SheetPortal>
      {showOverlay && <SheetOverlay />}
      <SheetPrimitive.Content ... >
```

### File: `src/components/CompanyResearchDialog.tsx`

Pass `modal={false}` to Sheet and `showOverlay={false}` to SheetContent:

```typescript
<Sheet open={isOpen} onOpenChange={onOpenChange} modal={false}>
  <SheetContent 
    side="right" 
    className="w-full sm:max-w-md flex flex-col p-0" 
    showOverlay={false}
  >
```

---

## Mobile Behavior

On mobile (below sm breakpoint):
- The sheet will still cover most of the screen (w-full)
- User can close with the X button
- This is acceptable UX for mobile since screen space is limited

On desktop (sm and above):
- Sheet only takes `sm:max-w-md` width (28rem / 448px)
- Contact page remains visible and interactive on the left
- Both panels work simultaneously

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/components/ui/sheet.tsx` | Add `modal` prop to Sheet component, add `showOverlay` prop to SheetContent |
| `src/components/CompanyResearchDialog.tsx` | Use `modal={false}` and `showOverlay={false}` to keep contact page interactive |
