import { 
  contacts, 
  bookings, 
  chatMessages, 
  userPreferences,
  users,
  userSessions,
  type Contact, 
  type InsertContact,
  type Booking,
  type InsertBooking,
  type ChatMessage,
  type InsertChatMessage,
  type UserPreference,
  type InsertUserPreference,
  type User,
  type InsertUser,
  type UserSession,
  type InsertUserSession
} from "@shared/schema";

export interface IStorage {
  // Users & Authentication
  findOrCreateUser(email: string, name: string): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  validateUserSession(token: string): Promise<{ user: User; session: UserSession } | null>;
  deleteUserSession(token: string): Promise<void>;
  
  // Contacts
  getContacts(userId?: string): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactByName(name: string, userId?: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Bookings
  getBookings(userId?: string): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  
  // Chat Messages
  getChatMessages(userId?: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // User Preferences
  getUserPreference(key: string, userId?: string): Promise<UserPreference | undefined>;
  setUserPreference(preference: InsertUserPreference): Promise<UserPreference>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userSessions: Map<string, UserSession>;
  private contacts: Map<number, Contact>;
  private bookings: Map<number, Booking>;
  private chatMessages: Map<number, ChatMessage>;
  private userPreferences: Map<string, UserPreference>;
  private currentContactId: number;
  private currentBookingId: number;
  private currentChatMessageId: number;
  private currentPreferenceId: number;
  private currentUserId: number;

  constructor() {
    this.users = new Map();
    this.userSessions = new Map();
    this.contacts = new Map();
    this.bookings = new Map();
    this.chatMessages = new Map();
    this.userPreferences = new Map();
    this.currentContactId = 1;
    this.currentBookingId = 1;
    this.currentChatMessageId = 1;
    this.currentPreferenceId = 1;
    this.currentUserId = 1;
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create a demo user first
    const demoUser: User = {
      id: "demo_user",
      email: "demo@bookme.ai",
      name: "Demo User",
      avatar: null,
      isPrivateMode: false,
      officeConnectionStatus: "disconnected",
      officeConnectionType: null,
      officeAccessToken: null,
      officeRefreshToken: null,
      officeCalendarId: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);

    // Add sample contacts
    const sampleContacts = [
      { userId: "demo_user", name: "Sarah Chen", email: "sarah.chen@company.com", role: "Product Manager", status: "online", isPrivate: false, officeContactId: null, avatar: null },
      { userId: "demo_user", name: "Alex Johnson", email: "alex.johnson@company.com", role: "Designer", status: "offline", isPrivate: false, officeContactId: null, avatar: null },
      { userId: "demo_user", name: "Emma Rodriguez", email: "emma.rodriguez@company.com", role: "Developer", status: "online", isPrivate: false, officeContactId: null, avatar: null },
    ];

    sampleContacts.forEach(contact => {
      const newContact: Contact = { ...contact, id: this.currentContactId++ };
      this.contacts.set(newContact.id, newContact);
    });

    // Add sample bookings for today
    const today = new Date();
    const sampleBookings = [
      {
        userId: "demo_user",
        title: "Team Standup",
        description: "Daily team sync",
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        contactId: null,
        type: "meeting",
        status: "scheduled",
        location: "Conference Room A",
        isAllDay: false,
        isPrivate: false,
        officeEventId: null,
        officeEventUrl: null,
      },
      {
        userId: "demo_user",
        title: "Product Review",
        description: "Review latest product features",
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
        contactId: 1,
        type: "meeting",
        status: "scheduled",
        location: "Zoom",
        isAllDay: false,
        isPrivate: false,
        officeEventId: null,
        officeEventUrl: null,
      },
    ];

    sampleBookings.forEach(booking => {
      const newBooking: Booking = { ...booking, id: this.currentBookingId++ };
      this.bookings.set(newBooking.id, newBooking);
    });

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: this.currentChatMessageId++,
      userId: "demo_user",
      content: "Hi! I'm your AI scheduling assistant. You can tell me things like 'Book me a meeting with Sam next week' or 'Schedule dinner with Alex Friday evening'. What would you like to schedule?",
      sender: "ai",
      timestamp: new Date(),
      metadata: null,
    };
    this.chatMessages.set(welcomeMessage.id, welcomeMessage);
  }

  // Users & Authentication
  async findOrCreateUser(email: string, name: string): Promise<User> {
    // Try to find existing user by email
    const existingUser = Array.from(this.users.values()).find(u => u.email === email);
    if (existingUser) {
      // Update last login
      existingUser.lastLoginAt = new Date();
      this.users.set(existingUser.id, existingUser);
      return existingUser;
    }

    // Create new user
    const userId = `user_${this.currentUserId++}`;
    const newUser: User = {
      id: userId,
      email,
      name,
      avatar: null,
      isPrivateMode: false,
      officeConnectionStatus: "disconnected",
      officeConnectionType: null,
      officeAccessToken: null,
      officeRefreshToken: null,
      officeCalendarId: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
    
    this.users.set(userId, newUser);
    return newUser;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // User Sessions
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const sessionId = `session_${Date.now()}_${Math.random()}`;
    const newSession: UserSession = {
      id: sessionId,
      ...session,
      createdAt: new Date(),
    };
    
    this.userSessions.set(session.token, newSession);
    return newSession;
  }

  async validateUserSession(token: string): Promise<{ user: User; session: UserSession } | null> {
    const session = this.userSessions.get(token);
    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const user = this.users.get(session.userId);
    if (!user) {
      return null;
    }

    return { user, session };
  }

  async deleteUserSession(token: string): Promise<void> {
    this.userSessions.delete(token);
  }

  // Contacts
  async getContacts(userId?: string): Promise<Contact[]> {
    if (userId) {
      return Array.from(this.contacts.values()).filter(c => c.userId === userId);
    }
    return Array.from(this.contacts.values());
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactByName(name: string, userId?: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(contact => 
      contact.name.toLowerCase().includes(name.toLowerCase()) &&
      (!userId || contact.userId === userId)
    );
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const contact: Contact = { 
      ...insertContact, 
      id,
      email: insertContact.email || null,
      avatar: insertContact.avatar || null,
      role: insertContact.role || null,
      isPrivate: insertContact.isPrivate || false,
      officeContactId: insertContact.officeContactId || null
    };
    this.contacts.set(id, contact);
    return contact;
  }

  // Bookings
  async getBookings(userId?: string): Promise<Booking[]> {
    if (userId) {
      return Array.from(this.bookings.values()).filter(b => b.userId === userId);
    }
    return Array.from(this.bookings.values());
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      booking => booking.startTime >= startDate && booking.startTime <= endDate &&
      (!userId || booking.userId === userId)
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const booking: Booking = { 
      ...insertBooking, 
      id,
      type: insertBooking.type || "meeting",
      status: insertBooking.status || "scheduled",
      isPrivate: insertBooking.isPrivate || false,
      description: insertBooking.description || null,
      contactId: insertBooking.contactId || null,
      location: insertBooking.location || null,
      isAllDay: insertBooking.isAllDay || false,
      officeEventId: insertBooking.officeEventId || null,
      officeEventUrl: insertBooking.officeEventUrl || null
    };
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
  async getChatMessages(userId?: string): Promise<ChatMessage[]> {
    let messages = Array.from(this.chatMessages.values());
    if (userId) {
      messages = messages.filter(m => m.userId === userId);
    }
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id, 
      timestamp: new Date(),
      metadata: insertMessage.metadata || null
    };
    this.chatMessages.set(id, message);
    return message;
  }

  // User Preferences  
  async getUserPreference(key: string, userId?: string): Promise<UserPreference | undefined> {
    const prefKey = userId ? `${userId}:${key}` : key;
    return this.userPreferences.get(prefKey);
  }

  async setUserPreference(insertPreference: InsertUserPreference): Promise<UserPreference> {
    const prefKey = `${insertPreference.userId}:${insertPreference.key}`;
    const existing = this.userPreferences.get(prefKey);
    if (existing) {
      existing.value = insertPreference.value;
      this.userPreferences.set(prefKey, existing);
      return existing;
    } else {
      const id = this.currentPreferenceId++;
      const preference: UserPreference = { ...insertPreference, id };
      this.userPreferences.set(prefKey, preference);
      return preference;
    }
  }
}

export const storage = new MemStorage();
