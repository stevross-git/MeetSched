import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertChatMessageSchema, 
  insertBookingSchema, 
  insertContactSchema,
  insertUserSchema,
  type BookingIntent 
} from "@shared/schema";
import { parseBookingIntent, generateTimeSlotSuggestions } from "./services/openai";
import { AuthService, requireAuth, optionalAuth } from "./services/auth";
import { OfficeConnectionService } from "./services/office";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required" });
      }

      const user = await AuthService.findOrCreateUser(email, name);
      const token = await AuthService.createSession(user.id);

      res.json({ user, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Failed to authenticate user" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await AuthService.logout(token);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      res.json({ user: req.user });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Office connection routes
  app.post("/api/office/connect", requireAuth, async (req, res) => {
    try {
      const { type } = req.body; // 'microsoft' or 'google'
      if (!type || !['microsoft', 'google'].includes(type)) {
        return res.status(400).json({ error: "Invalid connection type" });
      }

      const authUrl = await OfficeConnectionService.getAuthUrl(type, req.user.id);
      res.json({ authUrl });
    } catch (error) {
      console.error('Office connection error:', error);
      res.status(500).json({ error: "Failed to initiate office connection" });
    }
  });

  app.post("/api/office/callback", requireAuth, async (req, res) => {
    try {
      const { code, type } = req.body;
      if (!code || !type) {
        return res.status(400).json({ error: "Code and type are required" });
      }

      const connection = await OfficeConnectionService.handleCallback(req.user.id, type, code);
      res.json({ connection });
    } catch (error) {
      console.error('Office callback error:', error);
      res.status(500).json({ error: "Failed to complete office connection" });
    }
  });

  app.delete("/api/office/disconnect", requireAuth, async (req, res) => {
    try {
      await OfficeConnectionService.disconnect(req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect office" });
    }
  });

  // User preferences
  app.put("/api/user/privacy", requireAuth, async (req, res) => {
    try {
      const { isPrivateMode } = req.body;
      const updatedUser = await storage.updateUser(req.user.id, { isPrivateMode });
      res.json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to update privacy settings" });
    }
  });

  // Chat endpoints (now with user context)
  app.get("/api/chat/messages", optionalAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", optionalAuth, async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        userId: req.user?.id || "demo_user"
      });
      const message = await storage.createChatMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error('Chat message error:', error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // AI booking intent parsing
  app.post("/api/ai/parse-booking", optionalAuth, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const userId = req.user?.id;
      const intent = await parseBookingIntent(message);
      
      // Get existing bookings for context
      const existingBookings = await storage.getBookings(userId);
      
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
  app.get("/api/bookings", optionalAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const bookings = await storage.getBookings(userId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", optionalAuth, async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user?.id || "demo_user"
      });
      const booking = await storage.createBooking(bookingData);
      res.json(booking);
    } catch (error) {
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  app.get("/api/bookings/today", optionalAuth, async (req, res) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const userId = req.user?.id;
      const todayBookings = await storage.getBookingsByDateRange(startOfDay, endOfDay, userId);
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
  app.get("/api/contacts", optionalAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contacts = await storage.getContacts(userId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", optionalAuth, async (req, res) => {
    try {
      const contactData = insertContactSchema.parse({
        ...req.body,
        userId: req.user?.id || "demo_user"
      });
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: "Invalid contact data" });
    }
  });

  app.get("/api/contacts/search", optionalAuth, async (req, res) => {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Name parameter is required" });
      }
      
      const userId = req.user?.id;
      const contact = await storage.getContactByName(name, userId);
      res.json(contact || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to search contacts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
