import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role"),
  status: text("status").notNull().default("offline"), // online, offline, busy
  avatar: text("avatar"),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  contactId: integer("contact_id").references(() => contacts.id),
  type: text("type").notNull().default("meeting"), // meeting, appointment, call, etc.
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, cancelled
  location: text("location"),
  isAllDay: boolean("is_all_day").default(false),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user' or 'ai'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: jsonb("metadata"), // for storing AI parsing results, booking references, etc.
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// Insert schemas
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

// Types
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;

// AI Booking Intent Schema
export const bookingIntentSchema = z.object({
  event_type: z.string(),
  preferred_day: z.string().optional(),
  preferred_time: z.string().optional(),
  time_window: z.string().optional(),
  location: z.string().optional(),
  duration_minutes: z.number().default(60),
  invitees: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type BookingIntent = z.infer<typeof bookingIntentSchema>;
