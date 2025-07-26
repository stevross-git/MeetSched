import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertChatMessageSchema, 
  insertBookingSchema, 
  insertContactSchema,
  type BookingIntent 
} from "@shared/schema";
import { parseBookingIntent, generateTimeSlotSuggestions } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Chat endpoints
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // AI booking intent parsing
  app.post("/api/ai/parse-booking", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const intent = await parseBookingIntent(message);
      
      // Get existing bookings for context
      const existingBookings = await storage.getBookings();
      
      // Generate time slot suggestions
      const { timeSlots } = await generateTimeSlotSuggestions(intent, existingBookings);
      
      res.json({ 
        intent, 
        timeSlots,
        message: "I've analyzed your request. Here are some available time slots:"
      });
    } catch (error) {
      console.error("AI parsing error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to parse booking request"
      });
    }
  });

  // Booking endpoints
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(bookingData);
      res.json(booking);
    } catch (error) {
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  app.get("/api/bookings/today", async (req, res) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const todayBookings = await storage.getBookingsByDateRange(startOfDay, endOfDay);
      res.json(todayBookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's bookings" });
    }
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const booking = await storage.updateBookingStatus(id, status);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });

  // Contact endpoints
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: "Invalid contact data" });
    }
  });

  app.get("/api/contacts/search", async (req, res) => {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Name parameter is required" });
      }
      
      const contact = await storage.getContactByName(name);
      res.json(contact || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to search contacts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
