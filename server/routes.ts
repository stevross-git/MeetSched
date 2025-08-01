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
import { AuthService, requireAuth } from "./services/auth";
import { OfficeConnectionService } from "./services/office";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes (only public routes)
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

  // Office connection routes (require authentication)
  app.post("/api/office/connect", requireAuth, async (req, res) => {
    try {
      const { type } = req.body;
      if (!type || !['microsoft', 'google'].includes(type)) {
        return res.status(400).json({ error: "Invalid connection type" });
      }

      const authUrl = await OfficeConnectionService.getAuthUrl(type, req.user!.id);
      res.json({ authUrl });
    } catch (error) {
      console.error('Office connection error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to initiate office connection" });
    }
  });

  // OAuth callback route (public - handles redirect from Microsoft/Google)
  app.get("/api/office/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('OAuth error:', error);
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=${encodeURIComponent(error as string)}`);
      }
      
      if (!code || !state) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=missing_parameters`);
      }
      
      // Parse state to get userId and type
      const stateParts = (state as string).split(':');
      if (stateParts.length < 2) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=invalid_state`);
      }
      
      const [userId, type] = stateParts;
      
      try {
        const connection = await OfficeConnectionService.handleCallback(
          userId, 
          type as 'microsoft' | 'google', 
          code as string
        );
        
        // Redirect back to frontend with success
        const successUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}?office_connected=true&type=${type}&calendar=${encodeURIComponent(connection.calendarName || 'Calendar')}`;
        res.redirect(successUrl);
      } catch (error) {
        console.error('OAuth callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'connection_failed';
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=${encodeURIComponent(errorMessage)}`);
      }
    } catch (error) {
      console.error('Callback route error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=server_error`);
    }
  });

  app.delete("/api/office/disconnect", requireAuth, async (req, res) => {
    try {
      await OfficeConnectionService.disconnect(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect office" });
    }
  });

  // Get office connection status
  app.get("/api/office/status", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      res.json({
        connected: user.officeConnectionStatus === 'connected',
        type: user.officeConnectionType,
        status: user.officeConnectionStatus,
        hasCalendar: !!user.officeCalendarId
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get office status" });
    }
  });

  // Sync office data manually
  app.post("/api/office/sync", requireAuth, async (req, res) => {
    try {
      await OfficeConnectionService.syncUserData(req.user!);
      res.json({ 
        success: true, 
        message: "Calendar and contacts synced successfully" 
      });
    } catch (error) {
      console.error('Office sync error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to sync office data" 
      });
    }
  });

  // User preferences (require authentication)
  app.put("/api/user/privacy", requireAuth, async (req, res) => {
    try {
      const { isPrivateMode } = req.body;
      const updatedUser = await storage.updateUser(req.user!.id, { isPrivateMode });
      res.json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to update privacy settings" });
    }
  });

  // Chat endpoints (require authentication)
  app.get("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.user!.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const message = await storage.createChatMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error('Chat message error:', error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // AI booking intent parsing (require authentication)
  app.post("/api/ai/parse-booking", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const intent = await parseBookingIntent(message);
      
      // Get existing bookings for context (includes synced calendar events)
      const existingBookings = await storage.getBookings(req.user!.id);
      
      // Generate time slot suggestions
      const { timeSlots } = await generateTimeSlotSuggestions(intent, existingBookings);
      
      res.json({ 
        intent, 
        timeSlots,
        message: "I've analyzed your request and checked your calendar. Here are some available time slots:"
      });
    } catch (error) {
      console.error("AI parsing error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to parse booking request"
      });
    }
  });

  // Booking endpoints (require authentication)
  app.get("/api/bookings", requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getBookings(req.user!.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const booking = await storage.createBooking(bookingData);

      // Try to sync to office calendar if connected
      let syncResult = null;
      try {
        if (req.user && OfficeConnectionService.hasValidConnection(req.user)) {
          console.log(`Syncing booking to ${req.user.officeConnectionType} calendar...`);
          
          syncResult = await OfficeConnectionService.syncBookingToOffice(req.user, {
            title: booking.title,
            description: booking.description || undefined,
            startTime: new Date(booking.startTime),
            endTime: new Date(booking.endTime),
            location: booking.location || undefined,
            isPrivate: booking.isPrivate || false,
          });
          
          console.log('Calendar sync successful:', syncResult);
          
          // Update booking with office event details
          if (syncResult.eventId) {
            const updatedBooking = await storage.updateBooking(booking.id, {
              officeEventId: syncResult.eventId,
              officeEventUrl: syncResult.eventUrl || null,
            });
            
            if (updatedBooking) {
              res.json({
                ...updatedBooking,
                _syncStatus: 'success',
                _syncType: req.user.officeConnectionType
              });
              return;
            }
          }
        } else {
          console.log('No office connection available for sync');
        }
      } catch (syncError) {
        console.warn('Failed to sync booking to office calendar:', syncError);
        // Continue even if sync fails - don't block booking creation
        syncResult = { error: syncError instanceof Error ? syncError.message : 'Sync failed' };
      }

      res.json({
        ...booking,
        _syncStatus: syncResult?.error ? 'failed' : 'skipped',
        _syncError: syncResult?.error || null
      });
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  app.get("/api/bookings/today", requireAuth, async (req, res) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const todayBookings = await storage.getBookingsByDateRange(startOfDay, endOfDay, req.user!.id);
      res.json(todayBookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's bookings" });
    }
  });

  app.patch("/api/bookings/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      // Verify booking belongs to user
      const existingBooking = await storage.getBooking(id);
      if (!existingBooking || existingBooking.userId !== req.user!.id) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      const booking = await storage.updateBookingStatus(id, status);
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });

  // Contact endpoints (require authentication)
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contacts = await storage.getContacts(req.user!.id);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contactData = insertContactSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: "Invalid contact data" });
    }
  });

  app.get("/api/contacts/search", requireAuth, async (req, res) => {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Name parameter is required" });
      }
      
      const contact = await storage.getContactByName(name, req.user!.id);
      res.json(contact || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to search contacts" });
    }
  });

  // Calendar sync endpoints
  app.get("/api/calendar/events", requireAuth, async (req, res) => {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ error: "Start and end dates are required" });
      }
      
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      const events = await storage.getBookingsByDateRange(startDate, endDate, req.user!.id);
      
      // Transform bookings to calendar event format
      const calendarEvents = events.map(booking => ({
        id: booking.id,
        title: booking.title,
        start: booking.startTime,
        end: booking.endTime,
        description: booking.description,
        location: booking.location,
        type: booking.type,
        status: booking.status,
        isPrivate: booking.isPrivate,
        isAllDay: booking.isAllDay,
        officeEventId: booking.officeEventId,
        officeEventUrl: booking.officeEventUrl
      }));
      
      res.json(calendarEvents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  // People/contacts from office
  app.get("/api/people", requireAuth, async (req, res) => {
    try {
      // Get all contacts (includes synced people from office)
      const contacts = await storage.getContacts(req.user!.id);
      
      // Transform contacts to people format
      const people = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        role: contact.role,
        avatar: contact.avatar,
        status: contact.status,
        isFromOffice: !!contact.officeContactId,
        officeId: contact.officeContactId
      }));
      
      res.json(people);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  // Statistics endpoint
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getBookings(req.user!.id);
      const contacts = await storage.getContacts(req.user!.id);
      
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      const thisWeekBookings = bookings.filter(b => 
        new Date(b.startTime) >= startOfWeek && new Date(b.startTime) < endOfWeek
      );
      
      const syncedBookings = bookings.filter(b => !!b.officeEventId);
      const syncedContacts = contacts.filter(c => !!c.officeContactId);
      
      res.json({
        totalBookings: bookings.length,
        thisWeekBookings: thisWeekBookings.length,
        totalContacts: contacts.length,
        syncedBookings: syncedBookings.length,
        syncedContacts: syncedContacts.length,
        syncRate: bookings.length > 0 ? (syncedBookings.length / bookings.length * 100).toFixed(1) : '0'
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Health check endpoint (public)
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      features: {
        auth: true,
        microsoftOffice: !!process.env.MICROSOFT_CLIENT_ID,
        googleCalendar: !!process.env.GOOGLE_CLIENT_ID,
        openaiIntegration: !!process.env.OPENAI_API_KEY,
        calendarSync: true,
        peopleSync: true
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}