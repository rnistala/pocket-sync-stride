import { useState, useEffect } from "react";
import { getApiRoot } from "@/lib/config";

export interface Contact {
  id: string;
  contact_id?: string;
  name: string;
  status: string;
  company: string;
  city: string;
  followup_on: string;
  lastNotes: string;
  phone?: string;
  email?: string;
  profile?: string;
  starred?: boolean;
  score?: number;
  interactions?: Interaction[];
}

export interface Interaction {
  id: string;
  contactId: string;
  date: string;
  type: "call" | "whatsapp" | "email" | "meeting" | "ticket";
  notes: string;
  syncStatus: "synced" | "pending" | "local";
  followup_on?: string;
  dirty?: boolean;
}

const DB_NAME = "LeadManagerDB";
const DB_VERSION = 1;
const CONTACTS_STORE = "contacts";
const INTERACTIONS_STORE = "interactions";
const METADATA_STORE = "metadata";

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(CONTACTS_STORE)) {
          db.createObjectStore(CONTACTS_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(INTERACTIONS_STORE)) {
          const interactionStore = db.createObjectStore(INTERACTIONS_STORE, { keyPath: "id" });
          interactionStore.createIndex("contactId", "contactId", { unique: false });
        }

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: "key" });
        }
      };
    });
  }

  async getAllContacts(): Promise<Contact[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CONTACTS_STORE, "readonly");
      const store = transaction.objectStore(CONTACTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveContacts(contacts: Contact[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CONTACTS_STORE, "readwrite");
      const store = transaction.objectStore(CONTACTS_STORE);

      // Clear existing and add new
      store.clear();
      contacts.forEach(contact => store.add(contact));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllInteractions(): Promise<Interaction[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(INTERACTIONS_STORE, "readonly");
      const store = transaction.objectStore(INTERACTIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveInteractions(interactions: Interaction[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(INTERACTIONS_STORE, "readwrite");
      const store = transaction.objectStore(INTERACTIONS_STORE);

      // Clear existing and add new
      store.clear();
      interactions.forEach(interaction => store.add(interaction));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async addInteraction(interaction: Interaction): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(INTERACTIONS_STORE, "readwrite");
      const store = transaction.objectStore(INTERACTIONS_STORE);
      const request = store.add(interaction);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(METADATA_STORE, "readonly");
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(METADATA_STORE, "readwrite");
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const dbManager = new IndexedDBManager();

export const useLeadStorage = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await dbManager.init();
        const [loadedContacts, loadedInteractions, syncTime] = await Promise.all([
          dbManager.getAllContacts(),
          dbManager.getAllInteractions(),
          dbManager.getMetadata("lastSync"),
        ]);

        setContacts(loadedContacts);
        setInteractions(loadedInteractions);
        if (syncTime) {
          setLastSync(new Date(syncTime));
        }
      } catch (error) {
        console.error("Error loading data from IndexedDB:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const saveContacts = async (newContacts: Contact[]) => {
    await dbManager.saveContacts(newContacts);
    setContacts(newContacts);
  };

  const saveInteractions = async (newInteractions: Interaction[]) => {
    await dbManager.saveInteractions(newInteractions);
    setInteractions(newInteractions);
  };

  const addInteraction = async (contactId: string, type: Interaction["type"], notes: string) => {
    const newInteraction: Interaction = {
      id: crypto.randomUUID(),
      contactId,
      date: new Date().toISOString(),
      type,
      notes,
      syncStatus: "local",
    };
    
    await dbManager.addInteraction(newInteraction);
    setInteractions([...interactions, newInteraction]);
  };

  const getContactInteractions = (contactId: string) => {
    return interactions
      .filter((i) => i.contactId === contactId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const syncData = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const BATCH_SIZE = 1000;
    let offset = 0;
    let allContacts: Contact[] = [];
    let hasMore = true;

    // Fetch contacts in batches
    while (hasMore) {
      const apiRoot = await getApiRoot();
      const response = await fetch(
        `${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: 3, offset, limit: BATCH_SIZE }),
        }
      );

      if (response.ok) {
        const apiResponse = await response.json();
        const apiContacts = apiResponse.data?.[0]?.body || [];
        
        if (apiContacts.length === 0) {
          hasMore = false;
          break;
        }

        // Transform API data to match Contact interface
        const transformedContacts: Contact[] = apiContacts.map((contact: any) => ({
          id: contact.contact_id || contact.id,
          name: contact.name || "",
          status: contact.status || "Fresh",
          company: contact.company || "",
          city: contact.city || "",
          followup_on: contact.followup_on || "",
          lastNotes: contact.message || "",
          phone: contact.mobile || "",
          email: contact.email || "",
          score: parseInt(contact.score) || 0,
        }));
        
        allContacts = [...allContacts, ...transformedContacts];
        offset += BATCH_SIZE;

        // If we received fewer contacts than the batch size, we've reached the end
        if (apiContacts.length < BATCH_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // Save all fetched contacts
    if (allContacts.length > 0) {
      await saveContacts(allContacts);
    }

    // Mark interactions as synced
    const syncedInteractions = interactions.map((i) => ({
      ...i,
      syncStatus: "synced" as const,
    }));
    await saveInteractions(syncedInteractions);

    const now = new Date();
    setLastSync(now);
    await dbManager.setMetadata("lastSync", now.toISOString());
  };

  return {
    contacts,
    interactions,
    addInteraction,
    getContactInteractions,
    syncData,
    lastSync,
    isLoading,
  };
};
