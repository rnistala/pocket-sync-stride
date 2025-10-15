import { useState, useEffect } from "react";

export interface Contact {
  id: string;
  name: string;
  status: string;
  company: string;
  city: string;
  nextFollowUp: string;
  lastNotes: string;
  phone?: string;
  email?: string;
  interactions?: Interaction[];
}

export interface Interaction {
  id: string;
  contactId: string;
  date: string;
  type: "call" | "whatsapp" | "email" | "meeting";
  notes: string;
  syncStatus: "synced" | "pending" | "local";
}

const CONTACTS_KEY = "offline-contacts";
const INTERACTIONS_KEY = "offline-interactions";

export const useLeadStorage = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const storedContacts = localStorage.getItem(CONTACTS_KEY);
    if (storedContacts) {
      setContacts(JSON.parse(storedContacts));
    }

    const storedInteractions = localStorage.getItem(INTERACTIONS_KEY);
    if (storedInteractions) {
      setInteractions(JSON.parse(storedInteractions));
    }

    const syncTime = localStorage.getItem("last-sync");
    if (syncTime) {
      setLastSync(new Date(syncTime));
    }
  }, []);

  const saveContacts = (newContacts: Contact[]) => {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(newContacts));
    setContacts(newContacts);
  };

  const saveInteractions = (newInteractions: Interaction[]) => {
    localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(newInteractions));
    setInteractions(newInteractions);
  };

  const addInteraction = (contactId: string, type: Interaction["type"], notes: string) => {
    const newInteraction: Interaction = {
      id: crypto.randomUUID(),
      contactId,
      date: new Date().toISOString(),
      type,
      notes,
      syncStatus: "local",
    };
    saveInteractions([...interactions, newInteraction]);
  };

  const getContactInteractions = (contactId: string) => {
    return interactions
      .filter((i) => i.contactId === contactId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const syncData = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    // Fetch contacts from API
    const response = await fetch(
      `https://demo.opterix.in/api/public/formwidgetdatahardcode/${userId}/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 3, offset: 0, limit: 0 }),
      }
    );

    if (response.ok) {
      const apiResponse = await response.json();
      
      // Extract contacts from API response structure
      const apiContacts = apiResponse.data?.[0]?.body || [];
      
      // Transform API data to match Contact interface
      const transformedContacts: Contact[] = apiContacts.map((contact: any) => ({
        id: contact.contact_id || contact.id,
        name: contact.name || "",
        status: contact.status || "Fresh",
        company: contact.company || "",
        city: contact.city || "",
        nextFollowUp: contact.followup_on || new Date().toISOString(),
        lastNotes: contact.message || "",
        phone: contact.mobile || "",
        email: contact.email || "",
      }));
      
      saveContacts(transformedContacts);
    }

    // Mark interactions as synced (in real implementation, would upload to server)
    const syncedInteractions = interactions.map((i) => ({
      ...i,
      syncStatus: "synced" as const,
    }));
    saveInteractions(syncedInteractions);

    const now = new Date();
    setLastSync(now);
    localStorage.setItem("last-sync", now.toISOString());
  };

  return {
    contacts,
    interactions,
    addInteraction,
    getContactInteractions,
    syncData,
    lastSync,
  };
};
