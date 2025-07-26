import { 
  contacts, 
  bookings, 
  chatMessages, 
  userPreferences,
  type Contact, 
  type InsertContact,
  type Booking,
  type InsertBooking,
  type ChatMessage,
  type InsertChatMessage,
  type UserPreference,
  type InsertUserPreference
} from "@shared/schema";

export interface IStorage {
  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactByName(name: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Bookings
  getBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByDateRange(startDate: Date, endDate: Date): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  
  // Chat Messages
  getChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // User Preferences
  getUserPreference(key: string): Promise<UserPreference | undefined>;
  setUserPreference(preference: InsertUserPreference): Promise<UserPreference>;
}

export class MemStorage implements IStorage {
  private contacts: Map<number, Contact>;
  private bookings: Map<number, Booking>;
  private chatMessages: Map<number, ChatMessage>;
  private userPreferences: Map<string, UserPreference>;
  private currentContactId: number;
  private currentBookingId: number;
  private currentChatMessageId: number;
  private currentPreferenceId: number;

  constructor() {
    this.contacts = new Map();
    this.bookings = new Map();
    this.chatMessages = new Map();
    this.userPreferences = new Map();
    this.currentContactId = 1;
    this.currentBookingId = 1;
    this.currentChatMessageId = 1;
    this.currentPreferenceId = 1;
    
    // Initialize with some sample contacts
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Add sample contacts
    const sampleContacts = [
      { name: "Sarah Chen", email: "sarah.chen@company.com", role: "Product Manager", status: "online" },
      { name: "Alex Johnson", email: "alex.johnson@company.com", role: "Designer", status: "offline" },
      { name: "Emma Rodriguez", email: "emma.rodriguez@company.com", role: "Developer", status: "online" },
    ];

    sampleContacts.forEach(contact => {
      const newContact: Contact = { ...contact, id: this.currentContactId++ };
      this.contacts.set(newContact.id, newContact);
    });

    // Add sample bookings for today
    const today = new Date();
    const sampleBookings = [
      {
        title: "Team Standup",
        description: "Daily team sync",
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        contactId: null,
        type: "meeting",
        status: "scheduled",
        location: "Conference Room A",
        isAllDay: false,
      },
      {
        title: "Product Review",
        description: "Review latest product features",
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
        contactId: 1,
        type: "meeting",
        status: "scheduled",
        location: "Zoom",
        isAllDay: false,
      },
    ];

    sampleBookings.forEach(booking => {
      const newBooking: Booking = { ...booking, id: this.currentBookingId++ };
      this.bookings.set(newBooking.id, newBooking);
    });

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: this.currentChatMessageId++,
      content: "Hi! I'm your AI scheduling assistant. You can tell me things like 'Book me a meeting with Sam next week' or 'Schedule dinner with Alex Friday evening'. What would you like to schedule?",
      sender: "ai",
      timestamp: new Date(),
      metadata: null,
    };
    this.chatMessages.set(welcomeMessage.id, welcomeMessage);
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactByName(name: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(
      contact => contact.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const contact: Contact = { ...insertContact, id };
    this.contacts.set(id, contact);
    return contact;
  }

  // Bookings
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByDateRange(startDate: Date, endDate: Date): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      booking => booking.startTime >= startDate && booking.startTime <= endDate
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const booking: Booking = { ...insertBooking, id };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.status = status;
      this.bookings.set(id, booking);
    }
    return booking;
  }

  // Chat Messages
  async getChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id, 
      timestamp: new Date() 
    };
    this.chatMessages.set(id, message);
    return message;
  }

  // User Preferences
  async getUserPreference(key: string): Promise<UserPreference | undefined> {
    return this.userPreferences.get(key);
  }

  async setUserPreference(insertPreference: InsertUserPreference): Promise<UserPreference> {
    const existing = this.userPreferences.get(insertPreference.key);
    if (existing) {
      existing.value = insertPreference.value;
      this.userPreferences.set(insertPreference.key, existing);
      return existing;
    } else {
      const id = this.currentPreferenceId++;
      const preference: UserPreference = { ...insertPreference, id };
      this.userPreferences.set(insertPreference.key, preference);
      return preference;
    }
  }
}

export const storage = new MemStorage();
