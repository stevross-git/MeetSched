import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id), // Changed from uuid to text
  name: text("name").notNull(),
  email: text("email"),
  role: text("role"),
  status: text("status").notNull().default("offline"), // online, offline, busy
  avatar: text("avatar"),
  isPrivate: boolean("is_private").default(false),
  officeContactId: text("office_contact_id"), // ID from Office/Google contacts
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id), // Changed from uuid to text
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  contactId: integer("contact_id").references(() => contacts.id),
  type: text("type").notNull().default("meeting"), // meeting, appointment, call, etc.
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, cancelled
  location: text("location"),
  isAllDay: boolean("is_all_day").default(false),
  isPrivate: boolean("is_private").default(false),
  officeEventId: text("office_event_id"), // ID from Office/Google calendar
  officeEventUrl: text("office_event_url"), // Join URL for Teams/Meet
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id), // Changed from uuid to text
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user' or 'ai'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: jsonb("metadata"), // for storing AI parsing results, booking references, etc.
});

// Users table for authentication and profile management
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Changed from uuid to text to support "demo_user"
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  isPrivateMode: boolean("is_private_mode").default(false),
  officeConnectionStatus: text("office_connection_status").default("disconnected"), // connected, disconnected, error
  officeConnectionType: text("office_connection_type"), // outlook, google, teams
  officeAccessToken: text("office_access_token"), // encrypted
  officeRefreshToken: text("office_refresh_token"), // encrypted
  officeCalendarId: text("office_calendar_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id), // Changed from uuid to text
  key: text("key").notNull(),
  value: text("value").notNull(),
});

// User sessions for authentication
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id), // Changed from uuid to text
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

// AI Booking Intent Schema
export const bookingIntentSchema = z.object({
  event_type: z.string(),
  preferred_day: z.string().nullish(),
  preferred_time: z.string().nullish(),
  time_window: z.string().nullish(),
  location: z.string().nullish(),
  duration_minutes: z.number().default(60),
  invitees: z.array(z.string()).default([]),
  notes: z.string().nullish(),
});

export type BookingIntent = z.infer<typeof bookingIntentSchema>;