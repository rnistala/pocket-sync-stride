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

      request.onsuccess = () => {
        const result = request.result || [];
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveContacts(contacts: Contact[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CONTACTS_STORE, "readwrite");
      const store = transaction.objectStore(CONTACTS_STORE);

      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        // Add all contacts
        contacts.forEach(contact => {
          store.add(contact);
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async updateContact(contact: Contact): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CONTACTS_STORE, "readwrite");
      const store = transaction.objectStore(CONTACTS_STORE);
      const request = store.put(contact);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
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
  searchQuery: string;
  showStarredOnly: boolean;
  setScrollPosition: (position: number) => void;
  setDisplayCount: (count: number) => void;
  setSearchQuery: (query: string) => void;
  setShowStarredOnly: (show: boolean) => void;
  addInteraction: (contactId: string, type: Interaction["type"], notes: string, date?: string, followup_on?: string) => Promise<void>;
  getContactInteractions: (contactId: string) => Interaction[];
  syncData: () => Promise<void>;
  markInteractionsAsSynced: (contactId: string) => Promise<void>;
  mergeInteractionsFromAPI: (apiInteractions: any[], contactId: string) => Promise<void>;
  toggleStarred: (contactId: string) => Promise<void>;
  updateContactFollowUp: (contactId: string, followUpDate: string) => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [displayCount, setDisplayCount] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStarredOnly, setShowStarredOnly] = useState(false);

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

  const addInteraction = useCallback(async (contactId: string, type: Interaction["type"], notes: string, date?: string, followup_on?: string) => {
    const newInteraction: Interaction = {
      id: crypto.randomUUID(),
      contactId,
      date: date || new Date().toISOString(),
      type,
      notes,
      syncStatus: "local",
      followup_on,
      dirty: true,
    };
    
    await dbManager.addInteraction(newInteraction);
    setInteractions(prev => {
      const updated = [...prev, newInteraction];
      console.log("[ADD] Added interaction, total interactions now:", updated.length);
      console.log("[ADD] New interaction dirty status:", newInteraction.dirty);
      return updated;
    });
    
    // Update contact's followup_on if provided
    if (followup_on) {
      const updatedContacts = contacts.map(c => 
        c.id === contactId ? { ...c, followup_on } : c
      );
      await dbManager.saveContacts(updatedContacts);
      setContacts(updatedContacts);
    }
  }, [contacts]);

  // Memoize interactions by contact ID for faster lookups
  const interactionsByContact = useMemo(() => {
    const map = new Map<string, Interaction[]>();
    interactions.forEach(interaction => {
      const existing = map.get(interaction.contactId) || [];
      existing.push(interaction);
      map.set(interaction.contactId, existing);
    });
    // Sort each contact's interactions
    map.forEach((interactions, contactId) => {
      map.set(contactId, interactions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    });
    return map;
  }, [interactions]);

  const getContactInteractions = useCallback((contactId: string) => {
    return interactionsByContact.get(contactId) || [];
  }, [interactionsByContact]);

  const markInteractionsAsSynced = useCallback(async (contactId: string) => {
    const updatedInteractions = interactions.map(i => 
      (i.contactId === contactId && i.dirty) 
        ? { ...i, dirty: false, syncStatus: "synced" as const } 
        : i
    );
    await saveInteractions(updatedInteractions);
    setInteractions(updatedInteractions);
  }, [interactions, saveInteractions]);

  const mergeInteractionsFromAPI = useCallback(async (apiInteractions: any[], contactId: string) => {
    // Transform API interactions to our format
    const transformedInteractions: Interaction[] = apiInteractions.map((item: any) => ({
      id: item.id || crypto.randomUUID(),
      contactId: contactId,
      date: item.created || new Date().toISOString(),
      type: "call" as const, // Default type, can be enhanced based on API data
      notes: item.notes || "",
      syncStatus: "synced" as const,
      followup_on: item.next_meeting || undefined,
      dirty: false,
    }));

    // Merge with existing interactions, avoiding duplicates
    const existingIds = new Set(interactions.map(i => i.id));
    const newInteractions = transformedInteractions.filter(i => !existingIds.has(i.id));
    
    if (newInteractions.length > 0) {
      const mergedInteractions = [...interactions, ...newInteractions];
      await saveInteractions(mergedInteractions);
    }
  }, [interactions, saveInteractions]);

  const toggleStarred = useCallback(async (contactId: string) => {
    const updatedContacts = contacts.map(c => 
      c.id === contactId ? { ...c, starred: !c.starred } : c
    );
    
    // Update the changed contact in IndexedDB first
    const updatedContact = updatedContacts.find(c => c.id === contactId);
    if (updatedContact) {
      await dbManager.updateContact(updatedContact);
    }
    
    // Then update state
    setContacts(updatedContacts);
  }, [contacts]);

  const updateContactFollowUp = useCallback(async (contactId: string, followUpDate: string) => {
    const updatedContacts = contacts.map(c => 
      c.id === contactId ? { ...c, followup_on: followUpDate } : c
    );
    
    // Update the changed contact in IndexedDB first
    const updatedContact = updatedContacts.find(c => c.id === contactId);
    if (updatedContact) {
      await dbManager.updateContact(updatedContact);
    }
    
    // Then update state
    setContacts(updatedContacts);
  }, [contacts]);

  const syncData = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    console.log("[SYNC] Starting sync process");
    console.log("[SYNC] Total interactions:", interactions.length);

    // Step 1: Upload local changes to server
    const dirtyInteractions = interactions.filter(i => i.dirty);
    
    console.log("[SYNC] Dirty interactions found:", dirtyInteractions.length);
    console.log("[SYNC] Dirty interactions:", dirtyInteractions);
    
    if (dirtyInteractions.length > 0) {
      try {
        // Get latitude and longitude (using geolocation if available)
        let latitude = "";
        let longitude = "";
        
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            latitude = position.coords.latitude.toString();
            longitude = position.coords.longitude.toString();
          } catch (error) {
            console.log("Geolocation not available", error);
          }
        }

        // Group interactions by contact
        const interactionsByContact = dirtyInteractions.reduce((acc, interaction) => {
          if (!acc[interaction.contactId]) {
            acc[interaction.contactId] = [];
          }
          acc[interaction.contactId].push(interaction);
          return acc;
        }, {} as Record<string, Interaction[]>);

        // Upload each contact's interactions
        for (const [contactId, contactInteractions] of Object.entries(interactionsByContact)) {
          const contact = contacts.find(c => c.id === contactId);
          if (!contact) continue;

          console.log("[SYNC] Uploading interactions for contact:", contact.name, contactId);

          for (const interaction of contactInteractions) {
            const payload = {
              meta: {
                btable: "followup",
                htable: "",
                parentkey: "",
                preapi: "updatecontact",
                draftid: ""
              },
              data: [{
                body: [{
                  contact: contact.id, // Using contact.id (not contact_id)
                  contact_status: "",
                  notes: interaction.notes,
                  next_meeting: interaction.followup_on || "",
                  latitude: latitude,
                  longitude: longitude
                }],
                dirty: "true"
              }]
            };

            console.log("[SYNC] Uploading payload:", JSON.stringify(payload, null, 2));
            console.log("[SYNC] API URL:", `https://demo.opterix.in/api/public/tdata/${userId}`);

            const uploadResponse = await fetch(`https://demo.opterix.in/api/public/tdata/${userId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            console.log("[SYNC] Upload response status:", uploadResponse.status);
            const responseText = await uploadResponse.text();
            console.log("[SYNC] Upload response:", responseText);
          }
        }

        // Mark uploaded interactions as synced
        const updatedInteractions = interactions.map(i => 
          i.dirty ? { ...i, dirty: false, syncStatus: "synced" as const } : i
        );
        await saveInteractions(updatedInteractions);
        setInteractions(updatedInteractions);
        console.log("[SYNC] Marked interactions as synced");
      } catch (error) {
        console.error("[SYNC] Error uploading local changes:", error);
      }
    } else {
      console.log("[SYNC] No dirty interactions to upload, skipping upload step");
    }

    // Step 2: Fetch contacts from server and merge
    const BATCH_SIZE = 1000;
    let offset = 0;
    let fetchedContacts: Contact[] = [];
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
        
        console.log(`[SYNC] Fetched ${apiContacts.length} contacts at offset ${offset}`);
        
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
          followup_on: contact.followup_on || "",
          lastNotes: contact.message || "",
          phone: contact.mobile || "",
          email: contact.email || "",
          profile: contact.profile || "",
        }));
        
        fetchedContacts = [...fetchedContacts, ...transformedContacts];
        offset += BATCH_SIZE;

        console.log(`[SYNC] Total contacts fetched so far: ${fetchedContacts.length}`);

        if (apiContacts.length < BATCH_SIZE) {
          console.log(`[SYNC] Last batch received ${apiContacts.length} contacts (less than ${BATCH_SIZE}), stopping`);
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // Step 3: Merge server data with local data
    if (fetchedContacts.length > 0) {
      // Load fresh data from IndexedDB to ensure we have the latest local changes
      const localContactsFromDB = await dbManager.getAllContacts();
      const existingContactsMap = new Map(localContactsFromDB.map(c => [c.id, c]));
      
      console.log(`[SYNC] Merging with ${localContactsFromDB.length} local contacts from DB`);
      
      const mergedContacts = fetchedContacts.map(serverContact => {
        const localContact = existingContactsMap.get(serverContact.id);
        
        if (localContact) {
          // Merge: prefer local data for starred and followup_on
          return {
            ...serverContact,
            starred: localContact.starred || false,
            followup_on: localContact.followup_on !== serverContact.followup_on 
              ? localContact.followup_on 
              : serverContact.followup_on,
          };
        }
        
        return serverContact;
      });

      console.log(`[SYNC] Merged contacts - starred count: ${mergedContacts.filter(c => c.starred).length}`);
      await saveContacts(mergedContacts);
    }

    const now = new Date();
    setLastSync(now);
    await dbManager.setMetadata("lastSync", now.toISOString());
  }, [contacts, interactions, saveContacts, saveInteractions]);

  const value = useMemo(() => ({
    contacts,
    interactions,
    lastSync,
    isLoading,
    scrollPosition,
    displayCount,
    searchQuery,
    showStarredOnly,
    setScrollPosition,
    setDisplayCount,
    setSearchQuery,
    setShowStarredOnly,
    addInteraction,
    getContactInteractions,
    syncData,
    markInteractionsAsSynced,
    mergeInteractionsFromAPI,
    toggleStarred,
    updateContactFollowUp,
  }), [contacts, lastSync, isLoading, scrollPosition, displayCount, searchQuery, showStarredOnly, addInteraction, getContactInteractions, syncData, markInteractionsAsSynced, mergeInteractionsFromAPI, toggleStarred, updateContactFollowUp]);

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
