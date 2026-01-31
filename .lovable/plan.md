

# Enhanced AI Research: "Dig Deeper" Feature

## Current State
The Company Research dialog provides a one-shot research brief with:
- Summary, Industry, Products & Services
- Management Contacts, Address, Phone, Email
- Company Size, Recent News

**Limitation**: Users cannot ask follow-up questions or explore specific topics in more detail.

---

## Proposed Solution: Interactive Research Chat

Add a conversational interface that allows users to ask follow-up questions about the company, enabling deeper research on any topic of interest.

### Key Features

1. **Follow-up Questions Input**
   - Add a text input at the bottom of the research dialog
   - Users can type questions like:
     - "Tell me more about their recent expansion"
     - "What are their main competitors?"
     - "Find more contact details for their sales team"
     - "What is their financial history?"

2. **Research History**
   - Display a scrollable conversation showing:
     - Initial research brief (current data)
     - Follow-up questions and AI responses
   - Each response maintains the context of the company

3. **Quick Action Buttons**
   - Pre-defined "dig deeper" prompts for common needs:
     - "Competitors" - Find main competitors
     - "Financials" - Revenue, funding, growth
     - "Key People" - More management contacts
     - "Recent News" - Latest developments
     - "Social Media" - LinkedIn, Twitter presence

---

## Technical Implementation

### 1. New Edge Function: `research-company-followup`

Creates a follow-up research function that maintains conversation context:

```
supabase/functions/research-company-followup/index.ts
```

- Accepts: `companyName`, `city`, `question`, `previousContext` (optional)
- Uses Perplexity API with conversation history
- Returns: text response with citations

### 2. Updated Dialog Component

Modify `src/components/CompanyResearchDialog.tsx`:

**New State Variables:**
- `followUpMessages`: Array of { role: 'user' | 'assistant', content: string }
- `followUpInput`: Current user input
- `isFollowingUp`: Loading state for follow-up requests

**New UI Elements:**
- Scrollable conversation area below initial research
- Input field with send button
- Quick action chips for common questions
- "Clear Conversation" button to reset

### 3. UI Layout (Updated Dialog)

```
+------------------------------------------+
| Company Research: K.K. SERVICES      [X] |
+------------------------------------------+
|                                          |
| [Initial Research Brief - collapsible]   |
|   Summary: ...                           |
|   Industry: Consumer Electronics         |
|   Products: Home Appliance Repair...     |
|   Management Contacts: ...               |
|   ...                                    |
|                                          |
+------------------------------------------+
| Quick Actions:                           |
| [Competitors] [Financials] [Key People]  |
| [Recent News] [Social Media]             |
+------------------------------------------+
|                                          |
| Conversation:                            |
| ---------------------------------------- |
| You: Tell me about their competitors     |
| ---------------------------------------- |
| AI: The main competitors of K.K.         |
|     Services in the consumer electronics |
|     repair sector include...             |
| ---------------------------------------- |
|                                          |
+------------------------------------------+
| [Ask a question about this company...  ] |
| [Send]                                   |
+------------------------------------------+
|           [Close]  [Update Contact]      |
+------------------------------------------+
```

---

## Files to Create/Modify

### New Files:
1. **`supabase/functions/research-company-followup/index.ts`**
   - Edge function for follow-up questions
   - Maintains company context for accurate responses

### Modified Files:
1. **`src/components/CompanyResearchDialog.tsx`**
   - Add conversation state and UI
   - Add follow-up input and quick actions
   - Make initial research collapsible
   - Add scrollable conversation area

---

## Detailed Code Changes

### Edge Function: research-company-followup

- Accept `companyName`, `city`, `question`
- Use Perplexity API with context-aware prompt
- System prompt includes company context
- Return markdown response

### Dialog Component Updates

**New State:**
```typescript
const [followUpMessages, setFollowUpMessages] = useState<Array<{
  role: 'user' | 'assistant';
  content: string;
}>>([]);
const [followUpInput, setFollowUpInput] = useState("");
const [isFollowingUp, setIsFollowingUp] = useState(false);
```

**Quick Actions Data:**
```typescript
const quickActions = [
  { label: "Competitors", question: "Who are the main competitors of this company?" },
  { label: "Financials", question: "What is known about this company's financials, revenue, or funding?" },
  { label: "Key People", question: "Find more key people and decision makers at this company" },
  { label: "Recent News", question: "What are the latest news and developments about this company?" },
  { label: "Social Media", question: "Find this company's LinkedIn, website, and social media presence" },
];
```

**handleFollowUp Function:**
- Calls the new edge function
- Appends question and response to messages array
- Handles loading state and errors

---

## User Experience Flow

1. User opens AI Research dialog - sees initial brief (as today)
2. Quick action chips appear below the brief
3. User can either:
   - Click a quick action (e.g., "Competitors")
   - Type a custom question
4. Question appears in conversation area
5. AI response streams/loads below
6. User can continue asking questions
7. Conversation persists until dialog closes
8. Initial research brief remains collapsible at top

---

## Benefits

- **Deeper Insights**: Users can explore any aspect of a company in detail
- **Context-Aware**: Each follow-up understands the company context
- **Efficient**: Quick actions for common research needs
- **Flexible**: Custom questions for specific requirements
- **Sales Ready**: Find the right contacts and talking points before calls

