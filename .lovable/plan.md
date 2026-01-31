

# Transform Company Research Dialog into Side Panel Chat Interface

## Problem

The current dialog layout has several issues:
1. Follow-up responses are hidden until the Research Brief is collapsed
2. No natural chat flow - content doesn't scroll continuously
3. Fixed dialog doesn't make good use of screen space on desktop
4. Poor mobile experience with the modal blocking the contact page

## Solution: Side Panel Chat Interface

Replace the modal dialog with a **Sheet (slide-in panel)** that appears from the right side on desktop and can be toggled on mobile. This creates a true chat-like experience similar to messaging apps.

---

## Layout Design

### Desktop (768px and above)
```
+---------------------+------------------------+
|                     |                        |
|   Contact Page      |   AI Research Panel    |
|   (main content)    |   (right side sheet)   |
|                     |                        |
|   - Contact info    |   - Brief (collapsed)  |
|   - Interactions    |   - Chat messages      |
|   - Actions         |   - Quick actions      |
|                     |   - Input field        |
|                     |                        |
+---------------------+------------------------+
```

### Mobile (below 768px)
- Panel slides in from the right covering most of the screen
- An "X" button or swipe gesture closes it
- User can toggle between contact page and research panel

---

## Technical Implementation

### Changes to `src/components/CompanyResearchDialog.tsx`

1. **Rename to `CompanyResearchPanel.tsx`** (optional but clearer)

2. **Replace Dialog with Sheet component**
   - Use the existing Sheet component from `src/components/ui/sheet.tsx`
   - Sheet slides in from the right with `side="right"`
   - On desktop: Width set to `sm:max-w-md` (fixed width, doesn't cover full page)
   - On mobile: Nearly full width with slight margin

3. **Restructure the layout**:
   ```
   +----------------------------------+
   | [X] Company Research: COMPANY   |
   +----------------------------------+
   | [Research Brief ▼] (collapsed)  |
   |   (expandable summary section)  |
   +----------------------------------+
   |                                  |
   | Chat Messages Area (ScrollArea) |
   | - User question bubbles         |
   | - AI response bubbles           |
   | - Auto-scroll to new messages   |
   |                                  |
   +----------------------------------+
   | Dig Deeper: [chips...]          |
   | [Input.................] [Send] |
   +----------------------------------+
   ```

4. **Chat-style message flow**:
   - Initial research brief is collapsed by default after first follow-up
   - All messages flow in a continuous scrollable area
   - New messages appear at the bottom with auto-scroll
   - User messages aligned right, AI messages aligned left

5. **Auto-scroll behavior**:
   - Scroll to bottom when new message arrives
   - But allow user to scroll up to review earlier content

### Component Structure

```typescript
// Use Sheet instead of Dialog
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const CompanyResearchPanel = ({
  isOpen,
  onOpenChange,
  companyName,
  ...
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Company Research: {companyName}</SheetTitle>
        </SheetHeader>
        
        {/* Scrollable content area - takes available space */}
        <ScrollArea className="flex-1 p-4">
          {/* Collapsible Research Brief */}
          <Collapsible>...</Collapsible>
          
          {/* Chat Messages */}
          <div className="space-y-3">
            {followUpMessages.map(...)}
          </div>
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </ScrollArea>
        
        {/* Fixed footer with input */}
        <div className="border-t p-4 space-y-3">
          {/* Quick action chips */}
          {/* Input + Send button */}
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

---

## Updated Usage in ContactInteractions.tsx

The component is already imported and used correctly. The only change needed is updating the import name if we rename the file (optional).

```typescript
// Current usage (no change needed)
<CompanyResearchDialog
  isOpen={isResearchDialogOpen}
  onOpenChange={setIsResearchDialogOpen}
  companyName={contact.company || ""}
  city={contact.city}
  contactId={contact.id}
/>
```

---

## Detailed Changes

### File: `src/components/CompanyResearchDialog.tsx`

**Changes:**

1. **Replace imports**:
   - Remove: `Dialog, DialogContent, DialogHeader, DialogTitle`
   - Add: `Sheet, SheetContent, SheetHeader, SheetTitle` from `@/components/ui/sheet`
   - Add: `useIsMobile` hook

2. **Add auto-scroll ref and effect**:
   ```typescript
   const messagesEndRef = useRef<HTMLDivElement>(null);
   
   // Auto-scroll when new messages arrive
   useEffect(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [followUpMessages]);
   ```

3. **Replace Dialog wrapper with Sheet**:
   - Use `<Sheet>` and `<SheetContent side="right">`
   - Set width: `className="w-full sm:max-w-md"`

4. **Restructure layout for chat flow**:
   - Header: Fixed at top with company name
   - Body: Scrollable area containing:
     - Collapsible research brief (auto-collapses after first message)
     - Chat messages in continuous flow
   - Footer: Fixed at bottom with quick actions and input

5. **Auto-collapse brief after first follow-up**:
   ```typescript
   useEffect(() => {
     if (followUpMessages.length > 0) {
       setIsBriefOpen(false);
     }
   }, [followUpMessages.length]);
   ```

6. **Message bubble styling** (existing, but ensure proper alignment):
   - User messages: `bg-primary/10 ml-8` (right-aligned)
   - AI messages: `bg-muted mr-8` (left-aligned)

---

## Benefits

- **True chat experience**: Messages flow continuously like a messaging app
- **Better screen real estate**: Side panel on desktop lets users see both contact info and research
- **Mobile-friendly**: Full-screen panel with easy toggle
- **Immediate visibility**: Quick actions and input always visible in fixed footer
- **Natural scrolling**: Auto-scroll to new messages, manual scroll to review history

---

## Summary of File Changes

| File | Action |
|------|--------|
| `src/components/CompanyResearchDialog.tsx` | Major update: Convert from Dialog to Sheet, restructure for chat flow |

