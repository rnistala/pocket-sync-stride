

# UI Improvements for Company Research Dialog

## Issues to Fix

1. **Quick action buttons not immediately visible**: When users click on the input field, the quick action buttons should be prominently displayed
2. **Missing scrollbar on results**: When a quick action is clicked and results appear, there's no visible scrollbar, and the text starts mid-content instead of from the top
3. **Remove Update Contact button**: The footer button should be simplified to just "Close"

---

## Root Cause Analysis

### Scrollbar Issue
The current `scrollToBottom()` effect automatically scrolls to the end of messages when new content arrives. This is problematic because:
- Users want to read from the **start** of the AI response, not the end
- The ScrollArea needs an explicit height constraint to show the scrollbar properly

### Quick Actions Visibility
The quick action buttons are currently hidden inside the ScrollArea below the Research Brief. They should be more prominently placed near the input field.

---

## Solution

### Changes to `src/components/CompanyResearchDialog.tsx`

#### 1. Remove auto-scroll-to-bottom behavior
- Delete the `scrollToBottom()` function and its useEffect
- Instead, scroll to the **top** of the new message when it arrives

#### 2. Reposition Quick Actions
- Move quick action buttons to appear directly above the input field (in the fixed footer area)
- This makes them immediately visible when the user focuses on the input

#### 3. Fix ScrollArea height
- Ensure the ScrollArea has a proper max-height so the scrollbar appears
- Add explicit height constraints to the conversation area

#### 4. Remove Update Contact button
- Simplify the footer to only have the "Close" button

---

## Technical Changes

### Remove `scrollToBottom` and `messagesEndRef`
```typescript
// DELETE these lines:
const messagesEndRef = useRef<HTMLDivElement>(null);
const scrollToBottom = () => {...};
useEffect(() => { scrollToBottom(); }, [followUpMessages]);
```

### Add scroll-to-top behavior for new messages
```typescript
const scrollAreaRef = useRef<HTMLDivElement>(null);

// Scroll conversation area to show start of new assistant message
useEffect(() => {
  if (followUpMessages.length > 0) {
    const lastMessage = followUpMessages[followUpMessages.length - 1];
    if (lastMessage.role === 'assistant') {
      // Scroll to show the new message from the top
      scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }
}, [followUpMessages]);
```

### Move Quick Actions to footer area
The quick actions will be moved from inside the ScrollArea to just above the input field, making them always visible when the research data is loaded.

### Updated Layout Structure
```
+------------------------------------------+
| Company Research: COMPANY NAME       [X] |
+------------------------------------------+
| [ScrollArea - takes available space]     |
|   - Research Brief (collapsible)         |
|   - Conversation messages                |
+------------------------------------------+
| Dig Deeper: [Quick Action Chips]         |  <- Moved here
| [Input field..................] [Send]   |
+------------------------------------------+
|                              [Close]     |  <- Simplified
+------------------------------------------+
```

### ScrollArea Fix
- Give ScrollArea a minimum height and proper overflow handling
- Remove the `messagesEndRef` div at the end of messages
- Let natural scrolling work from the content start

---

## Summary of File Changes

**File: `src/components/CompanyResearchDialog.tsx`**

1. Remove `messagesEndRef`, `scrollToBottom`, and related useEffect
2. Move quick actions section from inside ScrollArea to the footer input area
3. Remove the "Update Contact" button from the footer
4. Ensure ScrollArea has proper height constraints
5. Remove the `handleUpdateContact` function and related `isUpdating` state (cleanup)

