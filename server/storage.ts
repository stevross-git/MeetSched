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
  getContacts(userId: string): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactByName(name: string, userId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Bookings
  getBookings(userId: string): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByDateRange(startDate: Date, endDate: Date, userId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  
  // Chat Messages
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // User Preferences
  getUserPreference(key: string, userId: string): Promise<UserPreference | undefined>;
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
    
    // No demo data initialization for production
    console.log('Production storage initialized - no demo data');
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

    // Create new user with UUID
    const userId = crypto.randomUUID();
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

    // Create welcome message for new user
    const welcomeMessage: ChatMessage = {
      id: this.currentChatMessageId++,
      userId: userId,
      content: "Welcome to AI Book Me! I'm your personal scheduling assistant. You can tell me things like 'Book me a meeting with Sam next week' or 'Schedule dinner with Alex Friday evening'. What would you like to schedule?",
      sender: "ai",
      timestamp: new Date(),
      metadata: null,
    };
    this.chatMessages.set(welcomeMessage.id, welcomeMessage);
    
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
    const sessionId = crypto.randomUUID();
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
      if (session) {
        this.userSessions.delete(token); // Clean up expired session
      }
      return null;
    }

    const user = this.users.get(session.userId);
    if (!user) {
      this.userSessions.delete(token); // Clean up orphaned session
      return null;
    }

    return { user, session };
  }

  async deleteUserSession(token: string): Promise<void> {
    this.userSessions.delete(token);
  }

  // Contacts (now requires userId)
  async getContacts(userId: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(c => c.userId === userId);
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactByName(name: string, userId: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(contact => 
      contact.name.toLowerCase().includes(name.toLowerCase()) &&
      contact.userId === userId
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

  // Bookings (now requires userId)
  async getBookings(userId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(b => b.userId === userId);
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByDateRange(startDate: Date, endDate: Date, userId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      booking => booking.startTime >= startDate && booking.startTime <= endDate &&
      booking.userId === userId
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

  // Chat Messages (now requires userId)
  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    const messages = Array.from(this.chatMessages.values()).filter(m => m.userId === userId);
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

  // User Preferences (now requires userId)
  async getUserPreference(key: string, userId: string): Promise<UserPreference | undefined> {
    const prefKey = `${userId}:${key}`;
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