import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { Contact, Interaction } from "@/hooks/useLeadStorage";

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

interface LeadContextType {
  contacts: Contact[];
  interactions: Interaction[];
  lastSync: Date | null;
  isLoading: boolean;
  scrollPosition: number;
  displayCount: number;
  setScrollPosition: (position: number) => void;
  setDisplayCount: (count: number) => void;
  addInteraction: (contactId: string, type: Interaction["type"], notes: string, date?: string) => Promise<void>;
  getContactInteractions: (contactId: string) => Interaction[];
  syncData: () => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [displayCount, setDisplayCount] = useState(50);

  // Load data once on mount
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

  const saveContacts = useCallback(async (newContacts: Contact[]) => {
    await dbManager.saveContacts(newContacts);
    setContacts(newContacts);
  }, []);

  const saveInteractions = useCallback(async (newInteractions: Interaction[]) => {
    await dbManager.saveInteractions(newInteractions);
    setInteractions(newInteractions);
  }, []);

  const addInteraction = useCallback(async (contactId: string, type: Interaction["type"], notes: string, date?: string) => {
    const newInteraction: Interaction = {
      id: crypto.randomUUID(),
      contactId,
      date: date || new Date().toISOString(),
      type,
      notes,
      syncStatus: "local",
    };
    
    await dbManager.addInteraction(newInteraction);
    setInteractions(prev => [...prev, newInteraction]);
  }, []);

  const getContactInteractions = useCallback((contactId: string) => {
    return interactions
      .filter((i) => i.contactId === contactId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [interactions]);

  const syncData = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const BATCH_SIZE = 1000;
    let offset = 0;
    let allContacts: Contact[] = [];
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://demo.opterix.in/api/public/formwidgetdatahardcode/${userId}/token`,
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

        const transformedContacts: Contact[] = apiContacts.map((contact: any) => ({
          id: contact.id,
          contact_id: contact.contact_id,
          name: contact.name || "",
          status: contact.status || "Fresh",
          company: contact.company || "",
          city: contact.city || "",
          nextFollowUp: contact.followup_on || new Date().toISOString(),
          lastNotes: contact.message || "",
          phone: contact.mobile || "",
          email: contact.email || "",
        }));
        
        allContacts = [...allContacts, ...transformedContacts];
        offset += BATCH_SIZE;

        if (apiContacts.length < BATCH_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    if (allContacts.length > 0) {
      await saveContacts(allContacts);
    }

    setInteractions(prev => {
      const syncedInteractions = prev.map((i) => ({
        ...i,
        syncStatus: "synced" as const,
      }));
      saveInteractions(syncedInteractions);
      return syncedInteractions;
    });

    const now = new Date();
    setLastSync(now);
    await dbManager.setMetadata("lastSync", now.toISOString());
  }, [saveContacts, saveInteractions]);

  const value = useMemo(() => ({
    contacts,
    interactions,
    lastSync,
    isLoading,
    scrollPosition,
    displayCount,
    setScrollPosition,
    setDisplayCount,
    addInteraction,
    getContactInteractions,
    syncData,
  }), [contacts, interactions, lastSync, isLoading, scrollPosition, displayCount, addInteraction, getContactInteractions, syncData]);

  return (
    <LeadContext.Provider value={value}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeadContext = () => {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error("useLeadContext must be used within LeadProvider");
  }
  return context;
};
