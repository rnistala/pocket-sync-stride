

# Extract Shared SendReportDialog Component

## Problem

Both `Dashboard.tsx` and `CustomerDashboard.tsx` contain nearly identical implementations of the Send Report dialog (~150 lines each). This duplication causes:
- Inconsistent UI/UX when one is updated but not the other
- Maintenance burden when fixing bugs or adding features
- The exact issue you encountered: fixing scrolling in one but not the other

## Solution

Create a single reusable `SendReportDialog` component that both pages import and use.

---

## Component Design

### Props Interface

```typescript
interface SendReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Customer info
  companyName: string;
  primaryEmail: string;
  
  // Report data
  monthLabel: string;
  stats: {
    totalTickets: number;
    closedTickets: number;
    openTickets: number;
    totalEffortMinutes: number;
    byRootCause: Record<string, number>;
    effortByRootCause: Record<string, number>;
  };
  closedTickets: Array<{
    id: string;
    ticketId?: string;
    description: string;
    rootCause?: string;
    effort_minutes?: number;
    closedDate?: string;
  }>;
  
  // Callbacks
  onSend: (payload: SendReportPayload) => Promise<void>;
}

interface SendReportPayload {
  recipients: string[];
  subject: string;
  customMessage: string;
}
```

### Component Features

1. **Internal state management** for:
   - `customMessage` (text)
   - `additionalRecipients` (array)
   - `newRecipientEmail` (input field)
   - `emailSubject` (with default from props)
   - `isSending` (loading state)

2. **Unified UI** with:
   - Recipients section (primary badge + additional badges + input)
   - Subject input
   - Mandatory message textarea
   - Scrollable HTML preview
   - Send button with recipient count

3. **Consistent scrolling behavior**:
   - Outer ScrollArea for dialog content
   - Inner 300px scrollable preview area

---

## Technical Implementation

### New File: `src/components/SendReportDialog.tsx`

The component will:
1. Accept props for customer data, stats, and tickets
2. Manage its own recipient/subject/message state
3. Generate the HTML preview using the same function (moved into component)
4. Call `onSend` with the prepared payload when user clicks send
5. Handle validation (message required, at least one recipient)

### Changes to `src/pages/Dashboard.tsx`

1. Remove ~100 lines of dialog JSX
2. Remove `generatePreviewHtml` function (move to component)
3. Keep state for `selectedCustomer`, `isEmailDialogOpen`, `isSendingEmail`
4. Render `<SendReportDialog>` with props from `selectedCustomer`
5. Move API call to `handleSendEmail` (receives payload from dialog)

### Changes to `src/pages/CustomerDashboard.tsx`

1. Remove ~100 lines of dialog JSX
2. Remove `generatePreviewHtml` function (move to component)
3. Remove local recipient/subject/message state (handled by component)
4. Render `<SendReportDialog>` with props from `contact` and `stats`
5. Keep API call in `handleSendEmail` (receives payload from dialog)

---

## Usage Example

```tsx
// In Dashboard.tsx
<SendReportDialog
  open={isEmailDialogOpen}
  onOpenChange={setIsEmailDialogOpen}
  companyName={selectedCustomer?.company || ""}
  primaryEmail={selectedCustomer?.email || ""}
  monthLabel={selectedMonthLabel}
  stats={{
    totalTickets: selectedCustomer.totalTickets,
    closedTickets: selectedCustomer.closedTickets,
    openTickets: selectedCustomer.openTickets,
    totalEffortMinutes: closedTickets.reduce(...),
    byRootCause: selectedCustomer.byRootCause,
    effortByRootCause: selectedCustomer.effortByRootCause,
  }}
  closedTickets={closedTickets}
  onSend={handleSendEmail}
/>
```

```tsx
// In CustomerDashboard.tsx
<SendReportDialog
  open={isPreviewOpen}
  onOpenChange={setIsPreviewOpen}
  companyName={contact?.company || ""}
  primaryEmail={contact?.email || ""}
  monthLabel={selectedMonthLabel}
  stats={{
    totalTickets: stats.totalTickets,
    closedTickets: stats.closedTickets,
    openTickets: stats.openTickets + stats.inProgressTickets,
    totalEffortMinutes: stats.totalEffortMinutes,
    byRootCause: stats.byRootCause,
    effortByRootCause: stats.effortByRootCause,
  }}
  closedTickets={closedTickets}
  onSend={handleSendEmail}
/>
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/SendReportDialog.tsx` | Create | New shared component with all dialog UI and preview generation |
| `src/pages/Dashboard.tsx` | Modify | Remove dialog JSX, import and use `SendReportDialog` |
| `src/pages/CustomerDashboard.tsx` | Modify | Remove dialog JSX, import and use `SendReportDialog` |

---

## Benefits

1. **Single source of truth** - Any fix or enhancement applies to both dialogs
2. **Reduced code** - Remove ~200 lines of duplicated JSX
3. **Guaranteed consistency** - Impossible for the dialogs to diverge
4. **Easier testing** - One component to test instead of two
5. **Better maintainability** - Changes in one place

