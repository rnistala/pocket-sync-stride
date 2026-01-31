

# Add Delete Interaction Feature

## Overview

Add a delete button to each interaction card that allows users to remove interactions from the list. Clicking delete will:
1. Show a confirmation dialog
2. Call the API to delete the interaction on the server
3. Remove the interaction from local state/IndexedDB

---

## Technical Implementation

### 1. Add Delete Interaction Function to LeadContext

**File: `src/contexts/LeadContext.tsx`**

Add a new `deleteInteraction` method to the IndexedDBManager class:
```typescript
async deleteInteraction(id: string): Promise<void> {
  if (!this.db) await this.init();
  return new Promise((resolve, reject) => {
    const transaction = this.db!.transaction(INTERACTIONS_STORE, "readwrite");
    const store = transaction.objectStore(INTERACTIONS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
```

Add the context function:
```typescript
deleteInteraction: (interactionId: string) => Promise<void>;
```

Implement the function in the provider:
```typescript
const deleteInteraction = useCallback(async (interactionId: string) => {
  const userId = localStorage.getItem("userId");
  if (!userId) throw new Error("User ID not found");

  const apiRoot = await getApiRoot();
  
  // Call the API to delete the interaction
  const response = await fetch(`${apiRoot}/api/public/deleteobject/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{
      id: interactionId,
      child: "",
      parent_id: null,
      parent: "followup"
    }]),
  });

  if (!response.ok) throw new Error("Failed to delete interaction");

  // Remove from local state
  setInteractions(prev => prev.filter(i => i.id !== interactionId && i.serverId !== interactionId));
  
  // Remove from IndexedDB
  await dbManager.deleteInteraction(interactionId);
}, []);
```

---

### 2. Add Delete Button to Interaction Cards

**File: `src/pages/ContactInteractions.tsx`**

Import requirements:
- Add `Trash2` icon from lucide-react
- Import AlertDialog components for confirmation
- Import the new `deleteInteraction` function from context

Add state for managing delete confirmation:
```typescript
const [deleteInteractionId, setDeleteInteractionId] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
```

Add delete handler:
```typescript
const handleDeleteInteraction = async () => {
  if (!deleteInteractionId) return;
  
  setIsDeleting(true);
  try {
    await deleteInteraction(deleteInteractionId);
    toast.success("Interaction deleted");
    setDeleteInteractionId(null);
  } catch (error) {
    console.error("Error deleting interaction:", error);
    toast.error("Failed to delete interaction");
  } finally {
    setIsDeleting(false);
  }
};
```

Update the interaction card to include a delete button (alongside the AddToInspirationButton):
```typescript
<Card key={interaction.id} className="p-3">
  <div className="flex items-start justify-between mb-1.5">
    <div className="flex items-center gap-1.5">
      <Badge variant="secondary" className="capitalize text-xs py-0">
        {interaction.type}
      </Badge>
      {interaction.dirty && (
        <div className="relative" title="Not synced yet">
          <Cloud className="h-3 w-3 text-amber-500" />
        </div>
      )}
    </div>
    <div className="flex items-center gap-2">
      <AddToInspirationButton ... />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setDeleteInteractionId(interaction.serverId || interaction.id)}
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </Button>
      <span className="text-xs text-muted-foreground">
        {format(new Date(interaction.date), "dd-MMM-yyyy")}
      </span>
    </div>
  </div>
  <p className="text-sm leading-relaxed">{interaction.notes}</p>
</Card>
```

Add confirmation AlertDialog (outside the map, at the end of the component):
```typescript
<AlertDialog 
  open={!!deleteInteractionId} 
  onOpenChange={(open) => !open && setDeleteInteractionId(null)}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Interaction?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete this interaction. This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        onClick={handleDeleteInteraction} 
        disabled={isDeleting}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/LeadContext.tsx` | Add `deleteInteraction` method to IndexedDBManager, context interface, and provider |
| `src/pages/ContactInteractions.tsx` | Add Trash2 icon, delete state, handler, AlertDialog for confirmation, and delete button in interaction cards |

---

## API Details

**Endpoint:** `POST https://demo.opterix.in/api/public/deleteobject/{userId}`

**Payload:**
```json
[{
  "id": "follow-up-id",
  "child": "",
  "parent_id": null,
  "parent": "followup"
}]
```

**Expected Response:**
```json
{"status": "success"}
```

---

## User Flow

1. User sees a trash icon on each interaction card
2. Clicking the trash icon opens a confirmation dialog
3. User confirms deletion
4. API is called to delete the interaction on the server
5. On success:
   - Interaction is removed from UI immediately
   - Interaction is removed from local IndexedDB
   - Success toast is shown
6. On failure:
   - Error toast is shown
   - Dialog closes
   - Interaction remains in the list

