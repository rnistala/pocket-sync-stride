import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { Contact, Interaction } from "@/hooks/useLeadStorage";
import { getApiRoot } from "@/lib/config";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getIssueTypeLabel } from "@/lib/issueTypeUtils";

export const DB_NAME = "LeadManagerDB";
export const DB_VERSION = 4;
const CONTACTS_STORE = "contacts";
const INTERACTIONS_STORE = "interactions";
const METADATA_STORE = "metadata";
const ORDERS_STORE = "orders";
const TICKETS_STORE = "tickets";

export interface Ticket {
  id: number;
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
  photo?: any[]; // Array of photo metadata from server
  priority?: boolean; // Star mark for priority tickets
  effort_minutes?: number; // Effort in minutes to solve the ticket
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
        contacts.forEach((contact) => {
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
      interactions.forEach((interaction) => store.add(interaction));

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
      orders.forEach((order) => {
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
      tickets.forEach((ticket) => store.add(ticket));

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

// Helper to get user's company (for customers)
const getUserCompany = (): string | null => {
  return localStorage.getItem("userCompany");
};

export interface AdvancedFilters {
  statuses: string[];
  city: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  scoreRange: string;
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
  filteredContactIds: string[];
  setScrollPosition: (position: number) => void;
  setDisplayCount: (count: number) => void;
  setSearchQuery: (query: string) => void;
  setShowStarredOnly: (show: boolean) => void;
  setAdvancedFilters: (filters: AdvancedFilters) => void;
  setFilteredContactIds: (ids: string[]) => void;
  addInteraction: (
    contactId: string,
    type: Interaction["type"],
    notes: string,
    date?: string,
    followup_on?: string,
  ) => Promise<void>;
  getContactInteractions: (contactId: string) => Interaction[];
  syncData: () => Promise<void>;
  markInteractionsAsSynced: (contactId: string) => Promise<void>;
  mergeInteractionsFromAPI: (apiInteractions: any[], contactId: string) => Promise<void>;
  toggleStarred: (contactId: string) => Promise<void>;
  updateContactFollowUp: (contactId: string, followUpDate: string, status?: string) => Promise<void>;
  updateContactStatus: (contactId: string, status: string) => Promise<void>;
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
    dateTo: undefined,
    scoreRange: "",
  });
  const [filteredContactIds, setFilteredContactIds] = useState<string[]>([]);

  // Load data once on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await dbManager.init();

        // Check if API root has changed
        const currentApiRoot = await getApiRoot();
        const storedApiRoot = await dbManager.getMetadata("apiRoot");
        const currentUserId = localStorage.getItem("userId");
        const storedUserId = await dbManager.getMetadata("lastUserId");

        // Check if user has changed
        if (storedUserId && storedUserId !== currentUserId) {
          console.log("[USER SWITCH] User changed, clearing all data");
          await dbManager.saveContacts([]);
          await dbManager.saveInteractions([]);
          await dbManager.saveOrders([]);
          await dbManager.saveTickets([]);
          await dbManager.setMetadata("lastSync", null);
          await dbManager.setMetadata("lastUserId", currentUserId);

          setContacts([]);
          setInteractions([]);
          setOrders([]);
          setTickets([]);
          setLastSync(null);
          return;
        }

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

          // Store current API root and userId if not set
          if (!storedApiRoot) {
            await dbManager.setMetadata("apiRoot", currentApiRoot);
          }
          if (!storedUserId && currentUserId) {
            await dbManager.setMetadata("lastUserId", currentUserId);
          }

          // Log contacts loaded from IndexedDB
          console.log("[INITIAL LOAD] Loaded", loadedContacts.length, "contacts from IndexedDB");
          console.log("[INITIAL LOAD] Last sync:", syncTime || "never");
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

  // Automatic sync of dirty interactions when network becomes available
  useEffect(() => {
    const syncDirtyInteractions = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId || !navigator.onLine) return;

      const dirtyInteractions = interactions.filter((i) => i.dirty);
      if (dirtyInteractions.length === 0) return;

      console.log("[AUTO SYNC] Network available, syncing", dirtyInteractions.length, "dirty interactions");

      try {
        // Get geolocation if available
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
            console.log("[AUTO SYNC] Geolocation not available", error);
          }
        }

        // Upload each dirty interaction
        for (const interaction of dirtyInteractions) {
          const contact = contacts.find((c) => c.id === interaction.contactId);
          if (!contact) continue;

          const apiRoot = await getApiRoot();
          const payload = {
            meta: {
              btable: "followup",
              htable: "",
              parentkey: "",
              preapi: "updatecontact",
              draftid: "",
            },
            data: [
              {
                body: [
                  {
                    contact: contact.id,
                    contact_status: "",
                    notes: interaction.notes,
                    next_meeting: interaction.followup_on || "",
                    latitude: latitude,
                    longitude: longitude,
                  },
                ],
                dirty: "true",
              },
            ],
          };

          await fetch(`${apiRoot}/api/public/tdata/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        // Mark all interactions as synced
        const updatedInteractions = interactions.map((i) =>
          i.dirty ? { ...i, dirty: false, syncStatus: "synced" as const } : i,
        );
        await saveInteractions(updatedInteractions);
        console.log("[AUTO SYNC] Successfully synced all dirty interactions");
      } catch (error) {
        console.error("[AUTO SYNC] Error syncing interactions:", error);
      }
    };

    // Listen for online event
    const handleOnline = () => {
      console.log("[AUTO SYNC] Network connection detected");
      syncDirtyInteractions();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [interactions, contacts, saveInteractions]);

  // Sync a single contact from server
  const syncSingleContact = useCallback(
    async (contactId: string) => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const apiRoot = await getApiRoot();

        const payload: any = {
          id: 3,
          offset: 0,
          limit: 1,
          extra: [{
            operator: "=",
            value: contactId,
            tablename: "contact",
            columnname: "id",
            function: "",
            datatype: "Selection",
            enable: "true",
            show: contactId,
            extracolumn: "id"
          }]
        };

        const response = await fetch(`${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const apiResponse = await response.json();
          const apiContacts = apiResponse.data?.[0]?.body || [];
          
          if (apiContacts.length > 0) {
            const contact = apiContacts[0];
            const updatedContact: Contact = {
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
              starred: contact.star === "Yes",
            };

            // Update in state
            const updatedContacts = contacts.map((c) => 
              c.id === contactId ? updatedContact : c
            );
            await saveContacts(updatedContacts);
            console.log("[SINGLE SYNC] Contact synced:", contactId);
          }
        }
      } catch (error) {
        console.error("[SINGLE SYNC] Error syncing contact:", error);
      }
    },
    [contacts, saveContacts]
  );

  const addInteraction = useCallback(
    async (contactId: string, type: Interaction["type"], notes: string, date?: string, followup_on?: string) => {
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
      const updatedInteractions = [...interactions, newInteraction];
      setInteractions(updatedInteractions);

      // Immediately sync if online
      if (navigator.onLine) {
        const userId = localStorage.getItem("userId");
        if (userId) {
          try {
            const contact = contacts.find((c) => c.id === contactId);
            if (!contact) return;

            console.log("[IMMEDIATE SYNC] Syncing new interaction for:", contact.name);

            // Get geolocation if available
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
                console.log("[IMMEDIATE SYNC] Geolocation not available", error);
              }
            }

            const apiRoot = await getApiRoot();
            const payload = {
              meta: {
                btable: "followup",
                htable: "",
                parentkey: "",
                preapi: "updatecontact",
                draftid: "",
              },
              data: [
                {
                  body: [
                    {
                      contact: contact.id,
                      contact_status: "",
                      notes: newInteraction.notes,
                      type: newInteraction.type,
                      next_meeting: newInteraction.followup_on || "",
                      latitude: latitude,
                      longitude: longitude,
                    },
                  ],
                  dirty: "true",
                },
              ],
            };

            const response = await fetch(`${apiRoot}/api/public/tdata/${userId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const result = await response.json();
              console.log("[IMMEDIATE SYNC] Successfully synced interaction", result);
              
              // Extract server ID from response
              let serverId = undefined;
              if (result.Detail && result.Detail[0] && result.Detail[0].body && result.Detail[0].body[0]) {
                serverId = result.Detail[0].body[0].id;
                console.log("[IMMEDIATE SYNC] Extracted server ID:", serverId);
              }
              
              // Mark as synced and save server ID
              const syncedInteractions = updatedInteractions.map((i) =>
                i.id === newInteraction.id 
                  ? { ...i, serverId, dirty: false, syncStatus: "synced" as const } 
                  : i
              );
              await saveInteractions(syncedInteractions);
              
              // Wait a moment for server to process, then sync contact data
              setTimeout(() => syncSingleContact(contactId), 1000);
            } else {
              console.error("[IMMEDIATE SYNC] Failed to sync:", response.status);
            }
          } catch (error) {
            console.error("[IMMEDIATE SYNC] Error syncing interaction:", error);
            // Keep it as dirty so auto-sync can retry later
          }
        }
      }

      // Update contact's followup_on, score, and lastNotes
      const updatedContacts = contacts.map((c) => {
        if (c.id === contactId) {
          return {
            ...c,
            followup_on: followup_on || c.followup_on,
            score: (c.score || 0) + 1,
            lastNotes: notes  // Update with the new interaction notes
          };
        }
        return c;
      });
      await dbManager.saveContacts(updatedContacts);
      setContacts(updatedContacts);
    },
    [interactions, contacts, saveInteractions, syncSingleContact],
  );

  // Memoize interactions by contact ID for faster lookups
  const interactionsByContact = useMemo(() => {
    const map = new Map<string, Interaction[]>();
    interactions.forEach((interaction) => {
      const existing = map.get(interaction.contactId) || [];
      existing.push(interaction);
      map.set(interaction.contactId, existing);
    });
    // Sort each contact's interactions
    map.forEach((interactions, contactId) => {
      map.set(
        contactId,
        interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      );
    });
    return map;
  }, [interactions]);

  const getContactInteractions = useCallback(
    (contactId: string) => {
      return interactionsByContact.get(contactId) || [];
    },
    [interactionsByContact],
  );

  const markInteractionsAsSynced = useCallback(
    async (contactId: string) => {
      const updatedInteractions = interactions.map((i) =>
        i.contactId === contactId && i.dirty ? { ...i, dirty: false, syncStatus: "synced" as const } : i,
      );
      await saveInteractions(updatedInteractions);
      setInteractions(updatedInteractions);
    },
    [interactions, saveInteractions],
  );

  const mergeInteractionsFromAPI = useCallback(
    async (apiInteractions: any[], contactId: string) => {
      // Transform API interactions to our format with server IDs
      const transformedInteractions: Interaction[] = apiInteractions.map((item: any) => ({
        id: crypto.randomUUID(), // Generate new local ID
        serverId: item.id, // Store server ID
        contactId: contactId,
        date: item.created || new Date().toISOString(),
        type: (item.type as Interaction["type"]) || "Call",
        notes: item.notes || "",
        syncStatus: "synced" as const,
        followup_on: item.next_meeting || undefined,
        dirty: false,
      }));

      // Get existing interactions for this contact
      const existingForContact = interactions.filter(i => i.contactId === contactId);
      
      // Create a set of existing server IDs
      const existingServerIds = new Set(
        existingForContact
          .filter(i => i.serverId)
          .map(i => i.serverId)
      );
      
      // Only add interactions with server IDs we don't have
      const newInteractions = transformedInteractions.filter(
        (i) => i.serverId && !existingServerIds.has(i.serverId)
      );

      let finalInteractions = interactions;
      
      if (newInteractions.length > 0) {
        console.log(`[MERGE] Adding ${newInteractions.length} new interactions from server`);
        finalInteractions = [...interactions, ...newInteractions];
        await saveInteractions(finalInteractions);
        setInteractions(finalInteractions);
      }
      
      // Always update contact score to match total interaction count
      const totalInteractionsForContact = finalInteractions.filter(i => i.contactId === contactId).length;
      const updatedContacts = contacts.map((c) => 
        c.id === contactId ? { ...c, score: totalInteractionsForContact } : c
      );
      await dbManager.saveContacts(updatedContacts);
      setContacts(updatedContacts);
    },
    [interactions, contacts, saveInteractions],
  );

  const toggleStarred = useCallback(
    async (contactId: string) => {
      const userId = localStorage.getItem("userId");
      
      const updatedContacts = contacts.map((c) => (c.id === contactId ? { ...c, starred: !c.starred } : c));

      // Update the changed contact in IndexedDB first
      const updatedContact = updatedContacts.find((c) => c.id === contactId);
      if (updatedContact) {
        await dbManager.updateContact(updatedContact);
        
        // Update server with new star status
        if (userId) {
          try {
            const apiRoot = await getApiRoot();
            const payload = {
              meta: {
                btable: "contact",
                htable: "",
                parentkey: "",
                preapi: "",
                draftid: "",
              },
              data: [
                {
                  body: [
                    {
                      id: contactId,
                      star: updatedContact.starred ? "Yes" : "No",
                    },
                  ],
                  dirty: "true",
                },
              ],
            };

            await fetch(`${apiRoot}/api/public/tdata/${userId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } catch (error) {
            console.error("Error updating star status on server:", error);
          }
        }
      }

      // Then update state
      setContacts(updatedContacts);
    },
    [contacts],
  );

  const updateContactFollowUp = useCallback(
    async (contactId: string, followUpDate: string, status?: string) => {
      const updatedContacts = contacts.map((c) =>
        c.id === contactId ? { ...c, followup_on: followUpDate, ...(status && { status }) } : c,
      );

      // Update the changed contact in IndexedDB first
      const updatedContact = updatedContacts.find((c) => c.id === contactId);
      if (updatedContact) {
        await dbManager.updateContact(updatedContact);
      }

      // Then update state
      setContacts(updatedContacts);
    },
    [contacts],
  );

  const updateContactStatus = useCallback(
    async (contactId: string, status: string) => {
      const updatedContacts = contacts.map((c) => (c.id === contactId ? { ...c, status } : c));

      // Update the changed contact in IndexedDB first
      const updatedContact = updatedContacts.find((c) => c.id === contactId);
      if (updatedContact) {
        await dbManager.updateContact(updatedContact);
      }

      // Then update state
      setContacts(updatedContacts);
    },
    [contacts],
  );

  const syncData = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    console.log("[SYNC] Starting sync process");
    console.log("[SYNC] Total interactions:", interactions.length);

    // Step 1: Upload local changes to server
    const dirtyInteractions = interactions.filter((i) => i.dirty);

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
        const interactionsByContact = dirtyInteractions.reduce(
          (acc, interaction) => {
            if (!acc[interaction.contactId]) {
              acc[interaction.contactId] = [];
            }
            acc[interaction.contactId].push(interaction);
            return acc;
          },
          {} as Record<string, Interaction[]>,
        );

        // Upload each contact's interactions
        for (const [contactId, contactInteractions] of Object.entries(interactionsByContact)) {
          const contact = contacts.find((c) => c.id === contactId);
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
                draftid: "",
              },
              data: [
                {
                  body: [
                    {
                      contact: contact.id, // Using contact.id (not contact_id)
                      contact_status: "",
                      notes: interaction.notes,
                      type: interaction.type,
                      next_meeting: interaction.followup_on || "",
                      latitude: latitude,
                      longitude: longitude,
                    },
                  ],
                  dirty: "true",
                },
              ],
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
        const updatedInteractions = interactions.map((i) =>
          i.dirty ? { ...i, dirty: false, syncStatus: "synced" as const } : i,
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

    console.log("[SYNC CONTACTS] Starting contact fetch, userId:", userId);

    while (hasMore) {
      const apiRoot = await getApiRoot();
      const userCompany = getUserCompany();
      const token = localStorage.getItem("userToken");
      
      console.log("[SYNC CONTACTS] Fetching batch at offset:", offset);
      console.log("[SYNC CONTACTS] UserCompany:", userCompany);
      console.log("[SYNC CONTACTS] Token exists:", !!token);
      
      const payload: any = {
        id: 3,
        offset,
        limit: BATCH_SIZE,
      };

      // If customer (has company), filter contacts by company
      if (userCompany && token) {
        // Parse user token to get user details
        const userData = JSON.parse(token);
        const userName = userData.companyforeign || userData.name || "";
        
        console.log("[SYNC CONTACTS] Customer login detected, adding extra filter");
        console.log("[SYNC CONTACTS] Company:", userCompany, "UserName:", userName);
        
        payload.extra = [{
          operator: "in",
          value: parseInt(userCompany),
          tablename: "contact",
          columnname: "id",
          function: "",
          datatype: "Selection",
          enable: "true",
          show: userName,
          extracolumn: "company"
        }];
      }

      console.log("[SYNC CONTACTS] Payload:", JSON.stringify(payload));
      console.log("[SYNC CONTACTS] URL:", `${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`);

      const response = await fetch(`${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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
          starred: contact.star === "Yes",
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

    // Step 3: Handle customer case when no contacts returned
    const userCompany = getUserCompany();
    if (userCompany && fetchedContacts.length === 0) {
      console.log("[SYNC] Customer login with no contacts from API, creating fallback contact");
      
      const token = localStorage.getItem("userToken");
      const userData = token ? JSON.parse(token) : {};
      const customerName = userData.companyforeign || userData.name || "Customer";
      
      // Create a single customer contact with id = userCompany
      const customerContact: Contact = {
        id: userCompany,
        contact_id: "",
        name: customerName,
        status: "Active",
        company: customerName,
        city: "",
        followup_on: "",
        lastNotes: "",
        phone: "",
        email: "",
        profile: "",
        score: 0,
        starred: false,
      };
      
      fetchedContacts = [customerContact];
      console.log("[SYNC] Created customer contact:", customerContact);
    }
    
    // Step 4: Merge server data with local data
    if (fetchedContacts.length > 0) {
      // Load fresh data from IndexedDB to ensure we have the latest local changes
      const localContactsFromDB = await dbManager.getAllContacts();
      const existingContactsMap = new Map(localContactsFromDB.map((c) => [c.id, c]));

      console.log(`[SYNC] Merging with ${localContactsFromDB.length} local contacts from DB`);

      const mergedContacts = fetchedContacts.map((serverContact) => {
        const localContact = existingContactsMap.get(serverContact.id);

        if (localContact) {
          // Merge: prefer server data including starred status
          return serverContact;
        }

        return serverContact;
      });

      console.log(`[SYNC] Merged contacts - starred count: ${mergedContacts.filter((c) => c.starred).length}`);
      await saveContacts(mergedContacts);
    }

    const now = new Date();
    setLastSync(now);
    await dbManager.setMetadata("lastSync", now.toISOString());
  }, [saveContacts, saveInteractions]);

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
        body: JSON.stringify(payload),
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
    const token = localStorage.getItem("userToken");
    const userCompany = getUserCompany();

    if (!userId || !token) {
      console.error("[TICKETS] Missing userId or token");
      return;
    }

    try {
      const apiRoot = await getApiRoot();
      const url = `${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`;
      
      // Build payload - add extra filter for customer logins
      const payload: any = { id: 555, offset: 0, limit: 100 };
      
      if (userCompany) {
        // Parse user token to get user details
        const userData = JSON.parse(token);
        const userName = userData.companyforeign || userData.name || "";
        
        payload.extra = [{
          operator: "in",
          value: userCompany,
          tablename: "ticket",
          columnname: "contact",
          function: "",
          datatype: "Selection",
          enable: "true",
          show: userName,
          extracolumn: "contact"
        }];
      }

      console.log("[TICKETS] Fetching from:", url);
      console.log("[TICKETS] Payload:", payload);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[TICKETS] Response status:", response.status);
      console.log("[TICKETS] Response ok:", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("[TICKETS] Response data:", result);

        if (result.data && result.data[0] && result.data[0].body) {
          const fetchedTickets = result.data[0].body.map((apiTicket: any) => ({
            id: String(apiTicket.id || crypto.randomUUID()),
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
            photo: apiTicket.photo || [],
            priority: apiTicket.priority === "High",
            effort_minutes: apiTicket.effort_minutes,
            syncStatus: "synced" as const,
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
  }, [contacts]);

  const syncTickets = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("userToken");

    console.log("=== [SYNC TICKETS] STARTING SYNC ===");
    console.log("[SYNC TICKETS] userId:", userId);
    console.log("[SYNC TICKETS] token:", token ? "present" : "missing");
    console.log("[SYNC TICKETS] All localStorage keys:", Object.keys(localStorage));

    if (!userId || !token) {
      console.error("[SYNC TICKETS] Missing userId or token - ABORTING");
      toast.error("Unable to sync: User not authenticated");
      return;
    }

    try {
      const apiRoot = await getApiRoot();
      console.log("[SYNC TICKETS] API Root:", apiRoot);

      // Step 1: Upload unsynced local tickets
      const unsyncedTickets = tickets.filter((t) => t.syncStatus !== "synced");
      console.log("[SYNC TICKETS] Total tickets:", tickets.length);
      console.log("[SYNC TICKETS] Unsynced tickets:", unsyncedTickets.length);
      console.log(
        "[SYNC TICKETS] Unsynced ticket IDs:",
        unsyncedTickets.map((t) => ({ id: t.id, ticketId: t.ticketId, status: t.syncStatus })),
      );

      for (const ticket of unsyncedTickets) {
        console.log(`\n--- [SYNC TICKETS] Processing ticket: ${ticket.id} ---`);

        // Upload screenshots first if any
        const photoMetadata = await uploadScreenshots(ticket.screenshots || [], userId);
        console.log("[SYNC TICKETS] Uploaded photos:", photoMetadata);

        // Merge with existing photos
        const existingPhotos = ticket.photo || [];
        const allPhotos = photoMetadata.length > 0 ? [...existingPhotos, ...photoMetadata] : existingPhotos;

        // For tickets without ID or with negative ID (local-only) - create new
        if (!ticket.id || ticket.id < 0) {
          console.log("[SYNC TICKETS] Creating NEW ticket (no server ID)");
          const createUrl = `${apiRoot}/api/public/tdata/${userId}`;
          console.log("[SYNC TICKETS] Create URL:", createUrl);

          const bodyData: any = {
            contact: ticket.contactId,
            issue_type: ticket.issueType,
            description: ticket.description,
            report_date: ticket.reportedDate,
            target_date: ticket.targetDate,
            status: ticket.status,
            remarks: ticket.remarks || "",
            root_cause: ticket.rootCause || "",
            priority: ticket.priority ? "High" : "Regular",
          };

          if (ticket.status === "CLOSED" && ticket.closedDate) {
            bodyData.close_date = ticket.closedDate;
          }

          // Add photo metadata if available
          if (allPhotos.length > 0) {
            bodyData.photo = JSON.stringify(allPhotos);
          }

          const createPayload = {
            meta: {
              btable: "ticket",
              htable: "",
              parentkey: "",
              preapi: "",
              draftid: "",
            },
            data: [
              {
                head: [],
                body: [bodyData],
                dirty: "true",
              },
            ],
          };

          console.log("[SYNC TICKETS] Create payload:", JSON.stringify(createPayload, null, 2));

          const createResponse = await fetch(createUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createPayload),
          });

          console.log("[SYNC TICKETS] Create response status:", createResponse.status);
          console.log("[SYNC TICKETS] Create response ok:", createResponse.ok);

          const responseText = await createResponse.text();
          console.log("[SYNC TICKETS] Create response body:", responseText);

          if (createResponse.ok) {
            const result = JSON.parse(responseText);
            console.log("[SYNC TICKETS] Create SUCCESS - parsed result:", result);

            // Extract server IDs from response
            let serverId: number = ticket.id;
            let serverTicketId = ticket.ticketId;

            if (result.Detail && result.Detail[0] && result.Detail[0].body && result.Detail[0].body[0]) {
              const responseBody = result.Detail[0].body[0];
              serverId = responseBody.id ? Number(responseBody.id) : serverId;
              serverTicketId = responseBody.ticket_id || serverTicketId;
              console.log("[SYNC TICKETS] Extracted server IDs - id:", serverId, "ticket_id:", serverTicketId);
            }

            // Update ticket with synced status and server IDs
            const updatedTicket = {
              ...ticket,
              id: serverId,
              ticketId: serverTicketId,
              photo: allPhotos,
              syncStatus: "synced" as const,
            };
            await dbManager.updateTicket(updatedTicket);
            console.log("[SYNC TICKETS] Updated ticket in IndexedDB with synced status");
          } else {
            console.error("[SYNC TICKETS] Create FAILED with status:", createResponse.status);
            console.error("[SYNC TICKETS] Error response:", responseText);
          }
        } else {
          console.log("[SYNC TICKETS] Updating EXISTING ticket (has server ID)");
          const updateUrl = `${apiRoot}/api/public/tdata/${userId}`;
          console.log("[SYNC TICKETS] Update URL:", updateUrl);

          const bodyData: any = {
            id: ticket.id,
            ticket_id: ticket.ticketId,
            contact: ticket.contactId,
            issue_type: ticket.issueType,
            description: ticket.description,
            report_date: ticket.reportedDate,
            target_date: ticket.targetDate,
            status: ticket.status,
            remarks: ticket.remarks || "",
            root_cause: ticket.rootCause || "",
            priority: ticket.priority ? "High" : "Regular",
          };

          if (ticket.status === "CLOSED" && ticket.closedDate) {
            bodyData.close_date = ticket.closedDate;
          }

          // Add photo metadata if available
          if (allPhotos.length > 0) {
            bodyData.photo = JSON.stringify(allPhotos);
          }

          const updatePayload = {
            meta: {
              btable: "ticket",
              htable: "",
              parentkey: "",
              preapi: "",
              draftid: "",
            },
            data: [
              {
                head: [],
                body: [bodyData],
                dirty: "true",
              },
            ],
          };

          console.log("[SYNC TICKETS] Update payload:", JSON.stringify(updatePayload, null, 2));

          const updateResponse = await fetch(updateUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });

          console.log("[SYNC TICKETS] Update response status:", updateResponse.status);
          console.log("[SYNC TICKETS] Update response ok:", updateResponse.ok);

          const responseText = await updateResponse.text();
          console.log("[SYNC TICKETS] Update response body:", responseText);

          if (updateResponse.ok) {
            console.log("[SYNC TICKETS] Update SUCCESS");

            // Update ticket with synced status
            const updatedTicket = { ...ticket, photo: allPhotos, syncStatus: "synced" as const };
            await dbManager.updateTicket(updatedTicket);
            console.log("[SYNC TICKETS] Updated ticket in IndexedDB with synced status");
          } else {
            console.error("[SYNC TICKETS] Update FAILED with status:", updateResponse.status);
            console.error("[SYNC TICKETS] Error response:", responseText);
          }
        }
      }

      console.log("\n=== [SYNC TICKETS] Step 2: Fetching changed tickets from server ===");
      // Step 2: Fetch tickets from server with pagination
      const BATCH_SIZE = 1000;
      let offset = 0;
      let allApiTickets: any[] = [];
      let hasMore = true;

      const fetchUrl = `${apiRoot}/api/public/formwidgetdatahardcode/${userId}/token`;
      console.log("[SYNC TICKETS] Fetch URL:", fetchUrl);

      while (hasMore) {
        console.log("[SYNC TICKETS] Fetching batch at offset:", offset);
        
        // Build payload - add extra filter for customer logins
        const fetchPayload: any = {
          id: 555,
          offset,
          limit: BATCH_SIZE,
        };
        
        const userCompany = getUserCompany();
        if (userCompany) {
          // Parse user token to get user details
          const userData = JSON.parse(token);
          const userName = userData.companyforeign || userData.name || "";
          
          fetchPayload.extra = [{
            operator: "in",
            value: userCompany,
            tablename: "ticket",
            columnname: "contact",
            function: "",
            datatype: "Selection",
            enable: "true",
            show: userName,
            extracolumn: "contact"
          }];
        }

        console.log("[SYNC TICKETS] Fetch payload:", JSON.stringify(fetchPayload, null, 2));

        const fetchResponse = await fetch(fetchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fetchPayload),
        });

        console.log("[SYNC TICKETS] Fetch response status:", fetchResponse.status);
        console.log("[SYNC TICKETS] Fetch response ok:", fetchResponse.ok);

        if (fetchResponse.ok) {
          const fetchResponseText = await fetchResponse.text();
          console.log("[SYNC TICKETS] Fetch response body length:", fetchResponseText.length);

          const result = JSON.parse(fetchResponseText);
          console.log("[SYNC TICKETS] Fetch SUCCESS - parsed result");

          if (result.data && result.data[0] && result.data[0].body) {
            const batchTickets = result.data[0].body;
            console.log(`[SYNC TICKETS] Fetched ${batchTickets.length} tickets at offset ${offset}`);

            if (batchTickets.length === 0) {
              hasMore = false;
              break;
            }

            allApiTickets = [...allApiTickets, ...batchTickets];
            offset += BATCH_SIZE;

            console.log(`[SYNC TICKETS] Total tickets fetched so far: ${allApiTickets.length}`);

            if (batchTickets.length < BATCH_SIZE) {
              console.log(`[SYNC TICKETS] Last batch received ${batchTickets.length} tickets (less than ${BATCH_SIZE}), stopping`);
              hasMore = false;
            }
          } else {
            console.warn("[SYNC TICKETS] No tickets in response or unexpected structure");
            hasMore = false;
          }
        } else {
          const fetchResponseText = await fetchResponse.text();
          console.error("[SYNC TICKETS] Fetch FAILED with status:", fetchResponse.status);
          console.error("[SYNC TICKETS] Error response:", fetchResponseText);
          hasMore = false;
        }
      }

      if (allApiTickets.length > 0) {
        console.log("[SYNC TICKETS] Total tickets fetched from server:", allApiTickets.length);

        // Filter out invalid tickets and map valid ones
        const serverTickets = allApiTickets
          .filter((apiTicket: any) => {
            if (apiTicket.id == null) {
              console.error("[SYNC TICKETS] Ignoring ticket with null id:", apiTicket);
              return false;
            }
            return true;
          })
          .map((apiTicket: any) => {
            let photoData = [];
            if (apiTicket.photo) {
              try {
                photoData = typeof apiTicket.photo === 'string' 
                  ? JSON.parse(apiTicket.photo) 
                  : apiTicket.photo;
              } catch (e) {
                console.error("[SYNC TICKETS] Failed to parse photo data:", e);
                photoData = [];
              }
            }
            
            return {
              id: Number(apiTicket.id),
              ticketId: apiTicket.ticket_id ? String(apiTicket.ticket_id) : undefined,
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
              photo: photoData,
              priority: apiTicket.priority === "High",
              effort_in_hours: apiTicket.effort_in_hours,
              effort_minutes: apiTicket.effort_minutes,
              syncStatus: "synced" as const,
            };
          });

        console.log("[SYNC TICKETS] Mapped server tickets:", serverTickets.length);
        console.log("[SYNC TICKETS] First server ticket sample:", serverTickets[0]);

        // Step 3: Merge with local data
        const localTickets = await dbManager.getAllTickets();
        console.log("[SYNC TICKETS] Local tickets before merge:", localTickets.length);

        const mergedTickets = [...localTickets];

        // Update or add server tickets
        for (const serverTicket of serverTickets) {
          // Match by ticketId if both tickets have it
          const existingIndex = mergedTickets.findIndex((t) => 
            t.ticketId && serverTicket.ticketId && t.ticketId === serverTicket.ticketId
          );
          
          if (existingIndex >= 0) {
            // Update existing ticket - keep local id if it's negative (local-only), otherwise use server id
            const localId = mergedTickets[existingIndex].id;
            mergedTickets[existingIndex] = { 
              ...serverTicket, 
              id: localId < 0 ? localId : serverTicket.id 
            };
            console.log("[SYNC TICKETS] Updated ticket - ticketId:", serverTicket.ticketId, "id:", serverTicket.id);
          } else {
            // Add new ticket from server
            mergedTickets.push(serverTicket);
            console.log("[SYNC TICKETS] Added new ticket - ticketId:", serverTicket.ticketId, "id:", serverTicket.id);
          }
        }

        // Remove synced tickets that are no longer on server
        const serverTicketIds = new Set(serverTickets.map((t) => t.ticketId));
        const filteredTickets = mergedTickets.filter((ticket) => {
          // Keep locally created tickets (pending sync)
          if (ticket.syncStatus === "pending") {
            console.log("[SYNC TICKETS] Keeping locally created ticket:", ticket.id);
            return true;
          }
          // Keep tickets that exist on server
          if (serverTicketIds.has(ticket.ticketId)) {
            return true;
          }
          // Remove synced tickets not found on server
          console.log("[SYNC TICKETS] Removing deleted ticket:", ticket.ticketId);
          return false;
        });

        // Save merged tickets
        await dbManager.saveTickets(filteredTickets);
        setTickets(filteredTickets);
        console.log("[SYNC TICKETS] Merge completed. Total tickets after merge:", filteredTickets.length);
      } else {
        console.log("[SYNC TICKETS] No tickets fetched from server");
      }

      localStorage.setItem("lastTicketSync", new Date().toISOString());
      console.log("=== [SYNC TICKETS] SYNC COMPLETED SUCCESSFULLY ===");
      toast.success("Tickets synced successfully");
    } catch (error) {
      console.error("=== [SYNC TICKETS] SYNC FAILED WITH ERROR ===");
      console.error("[SYNC TICKETS] Error:", error);
      console.error("[SYNC TICKETS] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      toast.error("Failed to sync tickets. Please try again.");
    }
  }, [tickets, contacts]);

  const uploadScreenshots = async (screenshots: string[], userId: string): Promise<any[]> => {
    if (!screenshots || screenshots.length === 0) {
      return [];
    }

    try {
      const apiRoot = await getApiRoot();
      const photoData = screenshots.map((screenshot, index) => ({
        name: `screenshot_${Date.now()}_${index}.png`,
        title: "photo",
        table: "ticket",
        photo: screenshot.startsWith("data:image") ? screenshot : `data:image/png;base64,${screenshot}`,
      }));

      console.log("[UPLOAD] Uploading screenshots:", photoData.length);

      const response = await fetch(`${apiRoot}/api/public/image/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photoData),
      });

      if (!response.ok) {
        console.error("[UPLOAD] Failed to upload screenshots:", response.status);
        return [];
      }

      const result = await response.json();
      console.log("[UPLOAD] Upload successful:", result);
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error("[UPLOAD] Error uploading screenshots:", error);
      return [];
    }
  };

  const addTicket = useCallback(async (ticket: Omit<Ticket, "id" | "syncStatus">): Promise<Ticket | undefined> => {
    const userId = localStorage.getItem("userId");
    const userCompany = getUserCompany();

    if (!userId) {
      console.error("[TICKET] Missing userId");
      return undefined;
    }

    // Contact validation is handled by API filtering - contacts array already contains only user's company contacts

    try {
      // Upload screenshots first
      const photoMetadata = await uploadScreenshots(ticket.screenshots || [], userId);
      console.log("[TICKET] Uploaded photos:", photoMetadata);

      // Prepare API payload
      // Build API payload, skipping null id and ticket_id for first submission
      const bodyData: any = {
        contact: ticket.contactId,
        issue_type: ticket.issueType,
        description: ticket.description,
        report_date: ticket.reportedDate,
        created: new Date().toISOString(),
        createdby: userId,
        remarks: ticket.remarks || "",
        priority: ticket.priority ? "High" : "Regular",
      };

      // Add photo metadata if available
      if (photoMetadata.length > 0) {
        bodyData.photo = JSON.stringify(photoMetadata);
      }

      const apiPayload = {
        meta: {
          btable: "ticket",
          htable: "",
          parentkey: "",
          preapi: "",
          draftid: "",
        },
        data: [
          {
            head: [],
            body: [bodyData],
            dirty: "true",
          },
        ],
      };

      console.log("[TICKET] Submitting ticket to API:", apiPayload);

      // Submit to API
      const apiRoot = await getApiRoot();
      const response = await fetch(`${apiRoot}/api/public/tdata/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const result = await response.json();
      console.log("[TICKET] API response:", result);

      // Extract id and ticket_id from response (API returns in Detail array)
      let serverId: number | undefined = undefined;
      let serverTicketId: string | undefined = undefined;

      if (result.Detail && result.Detail[0] && result.Detail[0].body && result.Detail[0].body[0]) {
        const responseBody = result.Detail[0].body[0];
        serverId = responseBody.id ? Number(responseBody.id) : undefined;
        serverTicketId = responseBody.ticket_id;
      }

      if (!serverId) {
        throw new Error("Server did not return a valid ticket ID");
      }

      // Create ticket with server-assigned IDs
      const newTicket: Ticket = {
        ...ticket,
        id: serverId,
        ticketId: serverTicketId,
        photo: photoMetadata,
        syncStatus: "synced",
      };

      await dbManager.addTicket(newTicket);
      setTickets((prev) => [...prev, newTicket]);

      console.log("[TICKET] Ticket created successfully. ID:", serverId, "Ticket ID:", serverTicketId);

      // Send email notification for all ticket types
      if (serverTicketId) {
        try {
          const contact = contacts.find(c => c.id === ticket.contactId);
          if (contact && contact.email) {
            console.log("[EMAIL] Sending notification for ticket:", serverTicketId);
            
            // Convert issue type code to display label (BR -> Problem, FR -> New Work, etc.)
            const issueTypeLabel = getIssueTypeLabel(ticket.issueType);
            
            const emailResponse = await supabase.functions.invoke('send-ticket-email', {
              body: {
                userId: userId,
                contactEmail: contact.email,
                ticketId: serverTicketId,
                issueType: issueTypeLabel,
                description: ticket.description
              }
            });
            
            console.log("[EMAIL] Response:", emailResponse);
            
            if (emailResponse.data?.success) {
              toast.success(`Ticket ${serverTicketId} created and email sent to ${contact.name}`);
            } else {
              console.log("[EMAIL] Failed to send email. Status:", emailResponse.data?.status);
              toast.warning(`Ticket ${serverTicketId} created but failed to send email to ${contact.name}`);
            }
          } else {
            toast.success(`Ticket ${serverTicketId} created successfully`);
          }
        } catch (emailError) {
          console.error("[EMAIL] Error sending notification:", emailError);
          toast.warning(`Ticket ${serverTicketId} created but failed to send email notification`);
        }
      }

      return newTicket;
    } catch (error) {
      console.error("[TICKET] Failed to create ticket:", error);

      // Fallback: create ticket locally if API fails
      const localId = -Date.now(); // Negative number ensures no conflict with server IDs
      const newTicket: Ticket = {
        ...ticket,
        id: localId,
        syncStatus: "local",
      };

      console.log("[TICKET] Created local-only ticket with temporary ID:", localId);
      await dbManager.addTicket(newTicket);
      setTickets((prev) => [...prev, newTicket]);
      return newTicket;
    }
  }, [contacts]);

  const updateTicket = useCallback(async (ticket: Ticket) => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      console.error("[TICKET] Missing userId for update");
      return;
    }

    try {
      console.log("[TICKET] Updating ticket:", ticket.id);

      // Upload new screenshots if any
      const photoMetadata = await uploadScreenshots(ticket.screenshots || [], userId);
      console.log("[TICKET] Uploaded photos for update:", photoMetadata);

      // Merge with existing photos
      const existingPhotos = ticket.photo || [];
      const allPhotos = photoMetadata.length > 0 ? [...existingPhotos, ...photoMetadata] : existingPhotos;

      const bodyData: any = {
        id: Number(ticket.id),
        status: ticket.status,
        target_date: ticket.targetDate,
        remarks: ticket.remarks || "",
        root_cause: ticket.rootCause || "",
        priority: ticket.priority ? "High" : "Regular",
        effort_minutes: ticket.effort_minutes || 0,
        ...(ticket.status === "CLOSED" && { close_date: new Date().toISOString() }),
        updated: new Date().toISOString(),
        updatedby: userId,
        assigned_to: Number(userId),
        description: ticket.description || "",
        contact: ticket.contactId,
        issue_type: ticket.issueType,
      };

      // Add photo metadata if available
      if (allPhotos.length > 0) {
        bodyData.photo = JSON.stringify(allPhotos);
      }

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
            draftid: "",
          },
          data: [
            {
              head: [],
              body: [bodyData],
              dirty: "true",
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("[TICKET] Update response:", result);

      // Update ticket with photo metadata
      const updatedTicket = { ...ticket, photo: allPhotos };

      // Update local storage
      await dbManager.updateTicket(updatedTicket);
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updatedTicket : t)));

      // Send email notification if ticket was closed
      if (ticket.status === "CLOSED" && ticket.ticketId) {
        try {
          console.log("[EMAIL] Looking for contact ID:", ticket.contactId, "in", contacts.length, "contacts");
          const contact = contacts.find(c => String(c.id) === String(ticket.contactId));
          
          // Get user email from userToken
          const userTokenStr = localStorage.getItem("userToken");
          const userToken = userTokenStr ? JSON.parse(userTokenStr) : null;
          const userEmail = userToken?.email;
          
          if (!contact) {
            console.warn("[EMAIL] Contact not found for ID:", ticket.contactId);
            toast.warning(`Ticket ${ticket.ticketId} closed - contact not found for email notification`);
          } else if (!contact.email) {
            console.warn("[EMAIL] Contact has no email:", contact.name);
            toast.warning(`Ticket ${ticket.ticketId} closed - contact has no email`);
          } else if (contact && contact.email) {
            console.log("[EMAIL] Sending closure notification for ticket:", ticket.ticketId);
            
            const issueTypeLabel = getIssueTypeLabel(ticket.issueType);
            
            const emailResponse = await supabase.functions.invoke('send-ticket-closure-email', {
              body: {
                userId: userId,
                contactEmail: contact.email,
                userEmail: userEmail,
                ticketId: ticket.ticketId,
                issueType: issueTypeLabel,
                description: ticket.description,
                remarks: ticket.remarks || '',
                rootCause: ticket.rootCause || '',
                effortMinutes: ticket.effort_minutes || 0
              }
            });
            
            console.log("[EMAIL] Closure response:", emailResponse);
            
            if (emailResponse.data?.success) {
              toast.success(`Ticket ${ticket.ticketId} closed and notification sent`);
            } else {
              console.log("[EMAIL] Failed to send closure email. Status:", emailResponse.data?.status);
              toast.warning(`Ticket ${ticket.ticketId} closed but failed to send notification`);
            }
          }
        } catch (emailError) {
          console.error("[EMAIL] Error sending closure notification:", emailError);
          toast.warning(`Ticket ${ticket.ticketId} closed but failed to send notification`);
        }
      } else {
        console.log("[TICKET] Ticket updated successfully");
      }

    } catch (error) {
      console.error("[TICKET] Failed to update ticket:", error);

      // Still update locally even if API fails
      await dbManager.updateTicket(ticket);
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
    }
  }, [contacts]);

  const getContactTickets = useCallback(
    (contactId: string) => {
      return tickets
        .filter((t) => t.contactId === contactId)
        .sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime());
    },
    [tickets],
  );

  const value = useMemo(
    () => ({
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
      filteredContactIds,
      setScrollPosition,
      setDisplayCount,
      setSearchQuery,
      setShowStarredOnly,
      setAdvancedFilters,
      setFilteredContactIds,
      addInteraction,
      getContactInteractions,
      syncData,
      markInteractionsAsSynced,
      mergeInteractionsFromAPI,
      toggleStarred,
      updateContactFollowUp,
      updateContactStatus,
      fetchOrders,
      fetchTickets,
      syncTickets,
      addTicket,
      updateTicket,
      getContactTickets,
    }),
    [
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
      filteredContactIds,
    ],
  );

  return <LeadContext.Provider value={value}>{children}</LeadContext.Provider>;
};

export const useLeadContext = () => {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error("useLeadContext must be used within LeadProvider");
  }
  return context;
};
