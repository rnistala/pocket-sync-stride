import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { Contact, Interaction } from "@/hooks/useLeadStorage";
import { getApiRoot } from "@/lib/config";

const DB_NAME = "LeadManagerDB";
const DB_VERSION = 4;
const CONTACTS_STORE = "contacts";
const INTERACTIONS_STORE = "interactions";
const METADATA_STORE = "metadata";
const ORDERS_STORE = "orders";
const TICKETS_STORE = "tickets";

export interface Ticket {
  id: string;
  ticketId?: string; // Server-assigned ticket ID from API
  contactId: string;
  reportedDate: string;
  targetDate: string;
  closedDate?: string;
  issueType: string;
  status: "OPEN" | "IN PROGRESS" | "CLOSED";
  description: string;
  remarks?: string;
  rootCause?: string;
  screenshots: string[]; // Array of base64 encoded images
  syncStatus: "synced" | "pending" | "local";
}

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

        if (!db.objectStoreNames.contains(ORDERS_STORE)) {
          db.createObjectStore(ORDERS_STORE, { keyPath: "id" });
        } else if (event.oldVersion < 3) {
          // Upgrade to version 3: recreate orders store with id as keyPath
          db.deleteObjectStore(ORDERS_STORE);
          db.createObjectStore(ORDERS_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(TICKETS_STORE)) {
          const ticketsStore = db.createObjectStore(TICKETS_STORE, { keyPath: "id" });
          ticketsStore.createIndex("contactId", "contactId", { unique: false });
          ticketsStore.createIndex("status", "status", { unique: false });
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

  async getAllOrders(): Promise<any[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(ORDERS_STORE, "readonly");
      const store = transaction.objectStore(ORDERS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveOrders(orders: any[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(ORDERS_STORE, "readwrite");
      const store = transaction.objectStore(ORDERS_STORE);

      store.clear();
      orders.forEach(order => {
        if (order.id) {
          store.add(order);
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error("[ORDERS] IndexedDB transaction error:", transaction.error);
        reject(transaction.error);
      };
    });
  }

  async getAllTickets(): Promise<Ticket[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(TICKETS_STORE, "readonly");
      const store = transaction.objectStore(TICKETS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTickets(tickets: Ticket[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(TICKETS_STORE, "readwrite");
      const store = transaction.objectStore(TICKETS_STORE);

      store.clear();
      tickets.forEach(ticket => store.add(ticket));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async addTicket(ticket: Ticket): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(TICKETS_STORE, "readwrite");
      const store = transaction.objectStore(TICKETS_STORE);
      const request = store.add(ticket);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateTicket(ticket: Ticket): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(TICKETS_STORE, "readwrite");
      const store = transaction.objectStore(TICKETS_STORE);
      const request = store.put(ticket);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const dbManager = new IndexedDBManager();

export interface AdvancedFilters {
  statuses: string[];
  city: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface LeadContextType {
  contacts: Contact[];
  interactions: Interaction[];
  orders: any[];
  tickets: Ticket[];
  lastSync: Date | null;
  isLoading: boolean;
  scrollPosition: number;
  displayCount: number;
  searchQuery: string;
  showStarredOnly: boolean;
  advancedFilters: AdvancedFilters;
  setScrollPosition: (position: number) => void;
  setDisplayCount: (count: number) => void;
  setSearchQuery: (query: string) => void;
  setShowStarredOnly: (show: boolean) => void;
  setAdvancedFilters: (filters: AdvancedFilters) => void;
  addInteraction: (contactId: string, type: Interaction["type"], notes: string, date?: string, followup_on?: string) => Promise<void>;
  getContactInteractions: (contactId: string) => Interaction[];
  syncData: () => Promise<void>;
  markInteractionsAsSynced: (contactId: string) => Promise<void>;
  mergeInteractionsFromAPI: (apiInteractions: any[], contactId: string) => Promise<void>;
  toggleStarred: (contactId: string) => Promise<void>;
  updateContactFollowUp: (contactId: string, followUpDate: string, status?: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchTickets: () => Promise<void>;
  syncTickets: () => Promise<void>;
  addTicket: (ticket: Omit<Ticket, "id" | "syncStatus">) => Promise<Ticket | undefined>;
  updateTicket: (ticket: Ticket) => Promise<void>;
  getContactTickets: (contactId: string) => Ticket[];
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [displayCount, setDisplayCount] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    statuses: [],
    city: "",
    dateFrom: undefined,
    dateTo: undefined
  });

  // Load data once on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await dbManager.init();
        
        // Check if API root has changed
        const currentApiRoot = await getApiRoot();
        const storedApiRoot = await dbManager.getMetadata("apiRoot");
        
        if (storedApiRoot && storedApiRoot !== currentApiRoot) {
          console.log("API root changed, clearing local data");
          // Clear all local data
          await dbManager.saveContacts([]);
          await dbManager.saveInteractions([]);
          await dbManager.saveOrders([]);
          await dbManager.setMetadata("lastSync", null);
          await dbManager.setMetadata("apiRoot", currentApiRoot);
          
          setContacts([]);
          setInteractions([]);
          setOrders([]);
          setLastSync(null);
        } else {
          // Load existing data
          const [loadedContacts, loadedInteractions, loadedOrders, loadedTickets, syncTime] = await Promise.all([
            dbManager.getAllContacts(),
            dbManager.getAllInteractions(),
            dbManager.getAllOrders(),
            dbManager.getAllTickets(),
            dbManager.getMetadata("lastSync"),
          ]);

          setContacts(loadedContacts);
          setInteractions(loadedInteractions);
          setOrders(loadedOrders);
          setTickets(loadedTickets);
          if (syncTime) {
            setLastSync(new Date(syncTime));
          }
          
          // Store current API root if not set
          if (!storedApiRoot) {
            await dbManager.setMetadata("apiRoot", currentApiRoot);
          }
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

  const updateContactFollowUp = useCallback(async (contactId: string, followUpDate: string, status?: string) => {
    const updatedContacts = contacts.map(c => 
      c.id === contactId ? { ...c, followup_on: followUpDate, ...(status && { status }) } : c
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
            const apiRoot = await getApiRoot();
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
            console.log("[SYNC] API URL:", `${apiRoot}/api/public/tdata/${userId}`);

            const uploadResponse = await fetch(`${apiRoot}/api/public/tdata/${userId}`, {
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
          score: parseInt(contact.score) || 0,
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
          // Merge: prefer server followup_on, but keep local starred status
          return {
            ...serverContact,
            starred: localContact.starred || false,
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

  const fetchOrders = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("userToken");
    
    console.log("[ORDERS] Starting fetchOrders");
    console.log("[ORDERS] userId:", userId);
    console.log("[ORDERS] token exists:", !!token);
    
    if (!userId || !token) {
      console.error("[ORDERS] Missing userId or token");
      return;
    }

    try {
      const apiRoot = await getApiRoot();
      const url = `${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`;
      const payload = { id: 78, offset: 0, limit: 0 };
      
      console.log("[ORDERS] Fetching from:", url);
      console.log("[ORDERS] Payload:", payload);
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log("[ORDERS] Response status:", response.status);
      console.log("[ORDERS] Response ok:", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("[ORDERS] Response data:", result);
        
        if (result.data && result.data[0] && result.data[0].body) {
          const fetchedOrders = result.data[0].body;
          console.log("[ORDERS] Fetched orders count:", fetchedOrders.length);
          console.log("[ORDERS] Sample order:", fetchedOrders[0]);
          
          await dbManager.saveOrders(fetchedOrders);
          setOrders(fetchedOrders);
          console.log("[ORDERS] Orders saved to IndexedDB and state updated");
        } else {
          console.error("[ORDERS] Unexpected response structure:", result);
        }
      } else {
        const errorText = await response.text();
        console.error("[ORDERS] API returned error status:", response.status);
        console.error("[ORDERS] Error response:", errorText);
      }
    } catch (error) {
      console.error("[ORDERS] Failed to fetch orders:", error);
      console.error("[ORDERS] Error details:", error instanceof Error ? error.message : String(error));
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    
    if (!userId || !token) {
      console.error("[TICKETS] Missing userId or token");
      return;
    }

    try {
      const apiRoot = await getApiRoot();
      const url = `${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`;
      const payload = { id: 555, offset: 0, limit: 100 };
      
      console.log("[TICKETS] Fetching from:", url);
      console.log("[TICKETS] Payload:", payload);
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log("[TICKETS] Response status:", response.status);
      console.log("[TICKETS] Response ok:", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("[TICKETS] Response data:", result);
        
        if (result.data && result.data[0] && result.data[0].body) {
          const fetchedTickets = result.data[0].body.map((apiTicket: any) => ({
            id: apiTicket.id || crypto.randomUUID(),
            ticketId: apiTicket.ticket_id,
            contactId: apiTicket.contact || "",
            reportedDate: apiTicket.report_date || new Date().toISOString(),
            targetDate: apiTicket.target_date || new Date().toISOString(),
            closedDate: apiTicket.close_date,
            issueType: apiTicket.issue_type || "",
            status: apiTicket.status || "OPEN",
            description: apiTicket.description || "",
            remarks: apiTicket.remarks || "",
            rootCause: apiTicket.root_cause || "",
            screenshots: [],
            syncStatus: "synced" as const
          }));
          
          console.log("[TICKETS] Fetched tickets count:", fetchedTickets.length);
          console.log("[TICKETS] Sample ticket:", fetchedTickets[0]);
          
          await dbManager.saveTickets(fetchedTickets);
          setTickets(fetchedTickets);
          console.log("[TICKETS] Tickets saved to IndexedDB and state updated");
        } else {
          console.error("[TICKETS] Unexpected response structure:", result);
        }
      } else {
        const errorText = await response.text();
        console.error("[TICKETS] API returned error status:", response.status);
        console.error("[TICKETS] Error response:", errorText);
      }
    } catch (error) {
      console.error("[TICKETS] Failed to fetch tickets:", error);
      console.error("[TICKETS] Error details:", error instanceof Error ? error.message : String(error));
    }
  }, []);

  const syncTickets = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    
    if (!userId || !token) {
      console.error("[SYNC TICKETS] Missing userId or token");
      return;
    }

    try {
      const apiRoot = await getApiRoot();
      
      // Step 1: Upload unsynced local tickets
      const unsyncedTickets = tickets.filter(t => t.syncStatus !== "synced");
      console.log("[SYNC TICKETS] Unsynced tickets:", unsyncedTickets.length);

      for (const ticket of unsyncedTickets) {
        // For tickets without ID - create new
        if (!ticket.id || ticket.id.includes('-')) {
          const createUrl = `${apiRoot}/api/public/formwidgetdata/${userId}/token`;
          const createPayload: any = {
            contact: ticket.contactId,
            report_date: ticket.reportedDate,
            target_date: ticket.targetDate,
            issue_type: ticket.issueType,
            status: ticket.status,
            description: ticket.description,
            remarks: ticket.remarks,
            root_cause: ticket.rootCause
          };
          
          if (ticket.status === "CLOSED" && ticket.closedDate) {
            createPayload.close_date = ticket.closedDate;
          }

          console.log("[SYNC TICKETS] Creating ticket:", createPayload);
          
          const createResponse = await fetch(createUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createPayload)
          });

          if (createResponse.ok) {
            const result = await createResponse.json();
            console.log("[SYNC TICKETS] Created ticket response:", result);
            
            // Update ticket with synced status
            const updatedTicket = { ...ticket, syncStatus: "synced" as const };
            await dbManager.updateTicket(updatedTicket);
          }
        } else {
          // For tickets with ID - update existing
          const updateUrl = `${apiRoot}/api/public/formwidgetdata/${userId}/token`;
          const updatePayload: any = {
            id: ticket.id,
            ticket_id: ticket.ticketId,
            contact: ticket.contactId,
            report_date: ticket.reportedDate,
            target_date: ticket.targetDate,
            issue_type: ticket.issueType,
            status: ticket.status,
            description: ticket.description,
            remarks: ticket.remarks,
            root_cause: ticket.rootCause
          };
          
          if (ticket.status === "CLOSED" && ticket.closedDate) {
            updatePayload.close_date = ticket.closedDate;
          }

          console.log("[SYNC TICKETS] Updating ticket:", updatePayload);
          
          const updateResponse = await fetch(updateUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload)
          });

          if (updateResponse.ok) {
            console.log("[SYNC TICKETS] Updated ticket successfully");
            
            // Update ticket with synced status
            const updatedTicket = { ...ticket, syncStatus: "synced" as const };
            await dbManager.updateTicket(updatedTicket);
          }
        }
      }

      // Step 2: Fetch tickets changed on server since last sync
      const lastSyncStr = localStorage.getItem("lastTicketSync");
      const lastSyncDate = lastSyncStr || new Date(0).toISOString();
      
      console.log("[SYNC TICKETS] Fetching changed tickets since:", lastSyncDate);
      
      const fetchUrl = `${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`;
      const fetchPayload = {
        id: 555,
        offset: 0,
        limit: 100,
        extra: [{
          operator: "in",
          value: lastSyncDate,
          tablename: "ticket",
          columnname: "updated",
          function: "",
          datatype: "Selection",
          enable: "true",
          show: lastSyncDate,
          extracolumn: "name"
        }]
      };
      
      console.log("[SYNC TICKETS] Fetch payload:", fetchPayload);
      
      const fetchResponse = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fetchPayload)
      });

      if (fetchResponse.ok) {
        const result = await fetchResponse.json();
        console.log("[SYNC TICKETS] Fetched changed tickets:", result);
        
        if (result.data && result.data[0] && result.data[0].body) {
          const serverTickets = result.data[0].body.map((apiTicket: any) => ({
            id: apiTicket.id || crypto.randomUUID(),
            ticketId: apiTicket.ticket_id,
            contactId: apiTicket.contact || "",
            reportedDate: apiTicket.report_date || new Date().toISOString(),
            targetDate: apiTicket.target_date || new Date().toISOString(),
            closedDate: apiTicket.close_date,
            issueType: apiTicket.issue_type || "",
            status: apiTicket.status || "OPEN",
            description: apiTicket.description || "",
            remarks: apiTicket.remarks || "",
            rootCause: apiTicket.root_cause || "",
            screenshots: [],
            syncStatus: "synced" as const
          }));
          
          console.log("[SYNC TICKETS] Server tickets to merge:", serverTickets.length);
          
          // Step 3: Merge with local data
          const localTickets = await dbManager.getAllTickets();
          const mergedTickets = [...localTickets];
          
          // Update or add server tickets
          for (const serverTicket of serverTickets) {
            const existingIndex = mergedTickets.findIndex(t => t.id === serverTicket.id);
            if (existingIndex >= 0) {
              // Update existing ticket
              mergedTickets[existingIndex] = serverTicket;
              console.log("[SYNC TICKETS] Updated ticket:", serverTicket.id);
            } else {
              // Add new ticket from server
              mergedTickets.push(serverTicket);
              console.log("[SYNC TICKETS] Added new ticket:", serverTicket.id);
            }
          }
          
          // Save merged tickets
          await dbManager.saveTickets(mergedTickets);
          setTickets(mergedTickets);
          console.log("[SYNC TICKETS] Merge completed. Total tickets:", mergedTickets.length);
        }
      }
      
      localStorage.setItem("lastTicketSync", new Date().toISOString());
      console.log("[SYNC TICKETS] Sync completed");
    } catch (error) {
      console.error("[SYNC TICKETS] Failed to sync tickets:", error);
    }
  }, [tickets]);

  const addTicket = useCallback(async (ticket: Omit<Ticket, "id" | "syncStatus">): Promise<Ticket | undefined> => {
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      console.error("[TICKET] Missing userId");
      return undefined;
    }

    try {
      // Prepare API payload
      // Build API payload, skipping null id and ticket_id for first submission
      const bodyData: any = {
        contact: ticket.contactId,
        issue_type: ticket.issueType,
        description: ticket.description,
        report_date: ticket.reportedDate,
        created: new Date().toISOString(),
        createdby: userId,
        remarks: ticket.remarks || ""
      };

      const apiPayload = {
        meta: {
          btable: "ticket",
          htable: "",
          parentkey: "",
          preapi: "",
          draftid: ""
        },
        data: [{
          head: [],
          body: [bodyData],
          dirty: "true"
        }]
      };

      console.log("[TICKET] Submitting ticket to API:", apiPayload);

      // Submit to API
      const response = await fetch(`https://demo.opterix.in/api/public/tdata/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const result = await response.json();
      console.log("[TICKET] API response:", result);

      // Extract id and ticket_id from response (API returns in Detail array)
      let serverId = crypto.randomUUID();
      let serverTicketId = undefined;
      
      if (result.Detail && result.Detail[0] && result.Detail[0].body && result.Detail[0].body[0]) {
        const responseBody = result.Detail[0].body[0];
        serverId = responseBody.id || serverId;
        serverTicketId = responseBody.ticket_id;
      }

      // Create ticket with server-assigned IDs
      const newTicket: Ticket = {
        ...ticket,
        id: serverId,
        ticketId: serverTicketId,
        syncStatus: "synced",
      };
      
      await dbManager.addTicket(newTicket);
      setTickets(prev => [...prev, newTicket]);
      
      console.log("[TICKET] Ticket created successfully. ID:", serverId, "Ticket ID:", serverTicketId);
      return newTicket;
    } catch (error) {
      console.error("[TICKET] Failed to create ticket:", error);
      
      // Fallback: create ticket locally if API fails
      const newTicket: Ticket = {
        ...ticket,
        id: crypto.randomUUID(),
        syncStatus: "local",
      };
      
      await dbManager.addTicket(newTicket);
      setTickets(prev => [...prev, newTicket]);
      return newTicket;
    }
  }, []);

  const updateTicket = useCallback(async (ticket: Ticket) => {
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      console.error("[TICKET] Missing userId for update");
      return;
    }

    try {
      console.log("[TICKET] Updating ticket:", ticket.id);
      
      const response = await fetch(`https://demo.opterix.in/api/public/tdata/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meta: {
            btable: "ticket",
            htable: "",
            parentkey: "",
            preapi: "",
            draftid: ""
          },
          data: [{
            head: [],
            body: [{
              id: ticket.id,
              status: ticket.status,
              target_date: ticket.targetDate,
              remarks: ticket.remarks || "",
              root_cause: ticket.rootCause || "",
              ...(ticket.status === "CLOSED" && { close_date: new Date().toISOString() }),
              updated: new Date().toISOString(),
              updatedby: userId
            }],
            dirty: "true"
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("[TICKET] Update response:", result);

      // Update local storage
      await dbManager.updateTicket(ticket);
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
      
      console.log("[TICKET] Ticket updated successfully");
    } catch (error) {
      console.error("[TICKET] Failed to update ticket:", error);
      
      // Still update locally even if API fails
      await dbManager.updateTicket(ticket);
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
    }
  }, []);

  const getContactTickets = useCallback((contactId: string) => {
    return tickets
      .filter(t => t.contactId === contactId)
      .sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime());
  }, [tickets]);

  const value = useMemo(() => ({
    contacts,
    interactions,
    orders,
    tickets,
    lastSync,
    isLoading,
    scrollPosition,
    displayCount,
    searchQuery,
    showStarredOnly,
    advancedFilters,
    setScrollPosition,
    setDisplayCount,
    setSearchQuery,
    setShowStarredOnly,
    setAdvancedFilters,
    addInteraction,
    getContactInteractions,
    syncData,
    markInteractionsAsSynced,
    mergeInteractionsFromAPI,
    toggleStarred,
    updateContactFollowUp,
    fetchOrders,
    fetchTickets,
    syncTickets,
    addTicket,
    updateTicket,
    getContactTickets,
  }), [contacts, interactions, orders, tickets, lastSync, isLoading, scrollPosition, displayCount, searchQuery, showStarredOnly, advancedFilters]);

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
