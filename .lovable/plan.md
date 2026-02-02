

# Persist Month/Year Selection in Effort Dashboard

## Problem

When you select a prior month (e.g., January 2026) in the Effort Dashboard and click on a customer to view their details, then navigate back to the Dashboard, the month selection resets to the current month (February 2026). This forces you to re-select the month every time you return.

## Solution

Store the selected month in the URL query parameter (`?month=2026-01`) so that when you navigate back using the browser's back button, the Dashboard restores the previously selected month. This follows the same pattern already used for the Follow-ups calendar.

---

## Technical Changes

### File: `src/pages/Dashboard.tsx`

**Current Implementation:**
```typescript
// Month filter - default to current month
const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});
```

**Updated Implementation:**
```typescript
import { useSearchParams } from "react-router-dom";

// Read month from URL, default to current month
const [searchParams, setSearchParams] = useSearchParams();

const selectedMonth = useMemo(() => {
  const urlMonth = searchParams.get('month');
  if (urlMonth) return urlMonth;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}, [searchParams]);

// Update URL when month changes
const setSelectedMonth = (value: string) => {
  const newParams = new URLSearchParams(searchParams);
  newParams.set('month', value);
  setSearchParams(newParams);
};
```

**Changes Summary:**
1. Import `useSearchParams` (already have `useNavigate` and `useParams` patterns in the codebase)
2. Replace `useState` with URL-based state using `searchParams.get('month')`
3. When the user selects a different month, update the URL using `setSearchParams`
4. The navigation to customer details already includes `?month=${selectedMonth}` so that behavior stays the same

---

## User Flow After Change

1. User visits `/dashboard` - URL becomes `/dashboard?month=2026-02` (current month)
2. User selects January 2026 - URL updates to `/dashboard?month=2026-01`
3. User clicks on a customer - navigates to `/dashboard/123?month=2026-01`
4. User clicks browser back button - returns to `/dashboard?month=2026-01`
5. January 2026 is still selected (persisted via URL)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Replace `useState` with `useSearchParams` for month selection |

