

# Support Multiple Email Addresses in "Add Another Email" Field

## Problem

Currently, the "Add another email..." input field only accepts one email at a time, and users must click the '+' button (or press Enter) to add each email. This is cumbersome when adding multiple recipients.

## Solution

1. **Support comma/space-separated emails**: Allow users to type multiple emails in the input field, separated by commas, semicolons, or spaces
2. **Auto-include pending emails on send**: Automatically parse and include any valid emails from the input field when "Send Report" is clicked
3. **Visual hint**: Update the placeholder to indicate multiple emails are supported

---

## Technical Changes

### File: `src/pages/Dashboard.tsx`

#### 1. Update `handleAddRecipient` to support multiple emails

```typescript
const handleAddRecipient = () => {
  const input = newRecipientEmail.trim();
  if (!input) return;
  
  // Split by comma, semicolon, or whitespace
  const emails = input.split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
  const validEmails: string[] = [];
  
  for (const email of emails) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 
        !additionalRecipients.includes(email) && 
        email !== primaryRecipient.toLowerCase()) {
      validEmails.push(email);
    }
  }
  
  if (validEmails.length > 0) {
    setAdditionalRecipients([...additionalRecipients, ...validEmails]);
  }
  setNewRecipientEmail("");
};
```

#### 2. Update `handleSendEmail` to auto-include pending emails

Before building `allRecipients`, parse the input field:

```typescript
// Include any email(s) typed but not explicitly added
let pendingRecipients = [...additionalRecipients];
const pendingInput = newRecipientEmail.trim();
if (pendingInput) {
  const pendingEmails = pendingInput.split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
  for (const email of pendingEmails) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 
        !pendingRecipients.includes(email) && 
        email !== primaryRecipient.toLowerCase()) {
      pendingRecipients.push(email);
    }
  }
}

const allRecipients = [primaryRecipient, ...pendingRecipients].filter(Boolean);
```

After successful send, clear the input:
```typescript
setNewRecipientEmail("");
```

#### 3. Update placeholder text

```typescript
placeholder="Add emails (comma-separated)..."
```

---

### File: `src/pages/CustomerDashboard.tsx`

Apply the same three changes:

#### 1. Update `handleAddRecipient`

```typescript
const handleAddRecipient = () => {
  const input = newRecipientEmail.trim();
  if (!input) return;
  
  const emails = input.split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
  const validEmails: string[] = [];
  const errors: string[] = [];
  
  for (const email of emails) {
    if (!isValidEmail(email)) {
      errors.push(`"${email}" is not valid`);
    } else if (email === contact?.email?.toLowerCase()) {
      errors.push(`"${email}" is already the primary`);
    } else if (additionalRecipients.includes(email)) {
      errors.push(`"${email}" already added`);
    } else {
      validEmails.push(email);
    }
  }
  
  if (validEmails.length > 0) {
    setAdditionalRecipients([...additionalRecipients, ...validEmails]);
  }
  if (errors.length > 0 && validEmails.length === 0) {
    toast.error(errors[0]); // Show first error
  }
  setNewRecipientEmail("");
};
```

#### 2. Update `handleSendEmail`

Before using `allRecipients`:

```typescript
// Include any email(s) typed but not explicitly added
let pendingRecipients = [...additionalRecipients];
const pendingInput = newRecipientEmail.trim();
if (pendingInput) {
  const pendingEmails = pendingInput.split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
  for (const email of pendingEmails) {
    if (isValidEmail(email) && 
        !pendingRecipients.includes(email) && 
        email !== contact?.email?.toLowerCase()) {
      pendingRecipients.push(email);
    }
  }
}

const finalRecipients = contact?.email 
  ? [contact.email, ...pendingRecipients] 
  : pendingRecipients;
```

Use `finalRecipients` instead of `allRecipients` in the API call.

After successful send:
```typescript
setNewRecipientEmail("");
```

#### 3. Update placeholder text

```typescript
placeholder="Add emails (comma-separated)..."
```

---

## User Experience After Change

1. User types: `alice@example.com, bob@test.com`
2. User can either:
   - Press Enter or click '+' to add them to the list immediately
   - OR just click "Send Report" directly
3. Both emails are included as recipients
4. Invalid emails are silently ignored (or error shown if all are invalid)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Update `handleAddRecipient` to parse multiple emails, update `handleSendEmail` to auto-include pending, update placeholder |
| `src/pages/CustomerDashboard.tsx` | Same three changes as Dashboard |

