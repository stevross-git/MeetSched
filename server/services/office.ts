import { User } from '../../shared/schema';
import { storage } from '../storage';

// Office 365 / Microsoft Graph API integration
export interface OfficeCalendarEvent {
  id: string;
  subject: string;
  body: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  isPrivate?: boolean;
  onlineMeeting?: {
    joinUrl: string;
  };
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  visibility?: 'public' | 'private';
  hangoutLink?: string;
}

export interface MicrosoftContact {
  id: string;
  displayName: string;
  emailAddresses: Array<{
    address: string;
    name?: string;
  }>;
  jobTitle?: string;
  companyName?: string;
}

export interface GoogleContact {
  resourceName: string;
  names: Array<{
    displayName: string;
  }>;
  emailAddresses: Array<{
    value: string;
  }>;
  organizations?: Array<{
    title?: string;
    name?: string;
  }>;
}

export class OfficeConnectionService {
  // Microsoft Graph API endpoints
  private static readonly GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

  // Google Calendar API endpoints
  private static readonly GOOGLE_CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';
  private static readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly GOOGLE_PEOPLE_BASE_URL = 'https://people.googleapis.com/v1';

  // Dynamic auth URL based on tenant configuration
  private static getGraphAuthUrl(): string {
    const tenantId = process.env.MICROSOFT_TENANT_ID;
    
    if (tenantId && tenantId !== 'common') {
      // Single tenant or specific tenant
      return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
    } else {
      // Multi-tenant (personal + organizational accounts)
      return 'https://login.microsoftonline.com/common/oauth2/v2.0';
    }
  }

  // Get OAuth URL for office connection
  static async getAuthUrl(type: 'microsoft' | 'google', userId: string): Promise<string> {
    const state = `${userId}:${type}:${Date.now()}`;
    
    if (type === 'microsoft') {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/api/office/callback`;
      
      if (!clientId) {
        throw new Error('Microsoft client ID not configured. Please set MICROSOFT_CLIENT_ID in environment variables.');
      }
      
      return this.generateMicrosoftAuthUrl(clientId, redirectUri, state);
    } else if (type === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/api/office/callback`;
      
      if (!clientId) {
        throw new Error('Google client ID not configured. Please set GOOGLE_CLIENT_ID in environment variables.');
      }
      
      return this.generateGoogleAuthUrl(clientId, redirectUri, state);
    }
    
    throw new Error('Unsupported connection type');
  }

  // Handle OAuth callback
  static async handleCallback(userId: string, type: 'microsoft' | 'google', code: string): Promise<any> {
    console.log(`Handling ${type} OAuth callback for user ${userId}`);
    
    if (type === 'microsoft') {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/api/office/callback`;

      if (!clientId) {
        throw new Error('Microsoft OAuth credentials not configured');
      }

      try {
        console.log('Exchanging Microsoft authorization code for tokens...');
        // Exchange code for tokens
        const tokenResponse = await this.exchangeMicrosoftCode(code, clientId, clientSecret || '', redirectUri);
        console.log('Token exchange successful, getting user calendars...');
        
        // Get user's primary calendar
        const calendars = await this.getMicrosoftCalendars(tokenResponse.accessToken);
        console.log(`Found ${calendars.length} calendars`);
        
        const primaryCalendar = calendars.find(cal => cal.isDefaultCalendar) || calendars[0];

        if (!primaryCalendar) {
          throw new Error('No calendar found');
        }

        console.log(`Using calendar: ${primaryCalendar.name} (${primaryCalendar.id})`);

        // Update user with connection details
        await storage.updateUser(userId, {
          officeConnectionStatus: 'connected',
          officeConnectionType: 'microsoft',
          officeAccessToken: tokenResponse.accessToken,
          officeRefreshToken: tokenResponse.refreshToken,
          officeCalendarId: primaryCalendar.id,
        });

        console.log('Microsoft Office connection completed successfully');

        return {
          type: 'microsoft',
          status: 'connected',
          calendarName: primaryCalendar.name,
          message: 'Microsoft Outlook connected successfully'
        };
      } catch (error) {
        console.error('Microsoft OAuth error:', error);
        // Update user with error status
        await storage.updateUser(userId, {
          officeConnectionStatus: 'error',
        });
        throw new Error(`Failed to connect Microsoft Outlook: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (type === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/api/office/callback`;

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
      }

      try {
        console.log('Exchanging Google authorization code for tokens...');
        const tokenResponse = await this.exchangeGoogleCode(code, clientId, clientSecret, redirectUri);
        console.log('Token exchange successful, getting user info...');

        // Get user's primary calendar
        const userInfo = await this.getGoogleUserInfo(tokenResponse.accessToken);
        console.log(`Connected Google account: ${userInfo.email}`);

        // Update user with connection details
        await storage.updateUser(userId, {
          officeConnectionStatus: 'connected',
          officeConnectionType: 'google',
          officeAccessToken: tokenResponse.accessToken,
          officeRefreshToken: tokenResponse.refreshToken,
          officeCalendarId: 'primary', // Google uses 'primary' for the main calendar
        });

        console.log('Google Calendar connection completed successfully');

        return {
          type: 'google',
          status: 'connected',
          calendarName: 'Google Calendar',
          message: 'Google Calendar connected successfully'
        };
      } catch (error) {
        console.error('Google OAuth error:', error);
        // Update user with error status
        await storage.updateUser(userId, {
          officeConnectionStatus: 'error',
        });
        throw new Error(`Failed to connect Google Calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    throw new Error('Unsupported connection type');
  }

  // Disconnect office connection
  static async disconnect(userId: string): Promise<void> {
    await storage.updateUser(userId, {
      officeConnectionStatus: 'disconnected',
      officeConnectionType: null,
      officeAccessToken: null,
      officeRefreshToken: null,
      officeCalendarId: null,
    });
  }

  // Sync user data from office - THIS WAS THE MISSING METHOD
  static async syncUserData(user: User): Promise<{ calendars: number; contacts: number; message: string }> {
    if (!this.hasValidConnection(user)) {
      throw new Error('No valid office connection found');
    }

    let syncedCalendars = 0;
    let syncedContacts = 0;

    try {
      if (user.officeConnectionType === 'microsoft') {
        // Sync Microsoft contacts
        const contacts = await this.getMicrosoftContacts(user.officeAccessToken!);
        
        for (const contact of contacts) {
          // Check if contact already exists
          const existingContact = await storage.getContactByName(contact.displayName, user.id);
          
          if (!existingContact) {
            await storage.createContact({
              userId: user.id,
              name: contact.displayName,
              email: contact.emailAddresses?.[0]?.address || null,
              role: contact.jobTitle || null,
              status: 'offline',
              isPrivate: false,
              officeContactId: contact.id,
            });
            syncedContacts++;
          }
        }

        // Sync Microsoft calendar events (optional - for viewing existing events)
        const startTime = new Date();
        startTime.setMonth(startTime.getMonth() - 1); // Last month
        const endTime = new Date();
        endTime.setMonth(endTime.getMonth() + 2); // Next 2 months
        
        const events = await this.getMicrosoftEvents(
          user.officeAccessToken!,
          user.officeCalendarId!,
          startTime.toISOString(),
          endTime.toISOString()
        );
        syncedCalendars = events.length;

      } else if (user.officeConnectionType === 'google') {
        // Sync Google contacts
        const contacts = await this.getGoogleContacts(user.officeAccessToken!);
        
        for (const contact of contacts) {
          if (contact.names?.[0]?.displayName) {
            // Check if contact already exists
            const existingContact = await storage.getContactByName(contact.names[0].displayName, user.id);
            
            if (!existingContact) {
              await storage.createContact({
                userId: user.id,
                name: contact.names[0].displayName,
                email: contact.emailAddresses?.[0]?.value || null,
                role: contact.organizations?.[0]?.title || null,
                status: 'offline',
                isPrivate: false,
                officeContactId: contact.resourceName,
              });
              syncedContacts++;
            }
          }
        }

        // Sync Google calendar events (optional - for viewing existing events)
        const startTime = new Date();
        startTime.setMonth(startTime.getMonth() - 1);
        const endTime = new Date();
        endTime.setMonth(endTime.getMonth() + 2);
        
        const events = await this.getGoogleEvents(
          user.officeAccessToken!,
          user.officeCalendarId!,
          startTime.toISOString(),
          endTime.toISOString()
        );
        syncedCalendars = events.length;
      }

      return {
        calendars: syncedCalendars,
        contacts: syncedContacts,
        message: `Synced ${syncedContacts} contacts and found ${syncedCalendars} calendar events`
      };

    } catch (error) {
      console.error('Sync error:', error);
      
      // If token is expired, try to refresh
      if (error instanceof Error && error.message.includes('401')) {
        try {
          await this.refreshTokenIfNeeded(user);
          // Retry sync after token refresh
          return await this.syncUserData(user);
        } catch (refreshError) {
          throw new Error(`Sync failed - token refresh failed: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`);
        }
      }
      
      throw new Error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate OAuth URL for Microsoft with proper tenant handling
  static generateMicrosoftAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const scopes = [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/People.Read',
      'https://graph.microsoft.com/Contacts.Read'
    ].join(' ');

    const authUrl = this.getGraphAuthUrl();

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      response_mode: 'query',
      prompt: 'select_account' // Always show account picker
    });

    console.log(`Generated Microsoft auth URL: ${authUrl}/authorize`);
    return `${authUrl}/authorize?${params.toString()}`;
  }

  // Generate OAuth URL for Google
  static generateGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/contacts.readonly'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    console.log(`Generated Google auth URL: ${this.GOOGLE_AUTH_URL}`);
    return `${this.GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  // Exchange authorization code for access token - handles both public and confidential clients
  static async exchangeMicrosoftCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const authUrl = this.getGraphAuthUrl();
    console.log(`Exchanging code at: ${authUrl}/token`);
    
    // Try with client secret first (confidential client)
    let body = new URLSearchParams({
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    // Add client secret if provided
    if (clientSecret && clientSecret.trim()) {
      body.append('client_secret', clientSecret);
      console.log('Using confidential client flow (with client_secret)');
    } else {
      console.log('Using public client flow (no client_secret)');
    }
    
    let response = await fetch(`${authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    // If failed with client secret, try without (public client)
    if (!response.ok && clientSecret && clientSecret.trim()) {
      console.log('Confidential client failed, trying public client flow (without client_secret)...');
      
      body = new URLSearchParams({
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      response = await fetch(`${authUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: body.toString(),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('Microsoft token exchange error:', error);
      console.error('Response status:', response.status, response.statusText);
      throw new Error(`Microsoft token exchange failed: ${response.status} ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    console.log('Token exchange successful');
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresIn: data.expires_in,
    };
  }

  // Exchange Google authorization code for tokens
  static async exchangeGoogleCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Google token exchange error:', error);
      throw new Error(`Google token exchange failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresIn: data.expires_in,
    };
  }

  // Get user's calendars from Microsoft Graph
  static async getMicrosoftCalendars(accessToken: string): Promise<any[]> {
    const response = await fetch(`${this.GRAPH_BASE_URL}/me/calendars`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Microsoft calendars fetch error:', error);
      throw new Error(`Failed to fetch Microsoft calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  // Get Microsoft contacts
  static async getMicrosoftContacts(accessToken: string): Promise<MicrosoftContact[]> {
    const response = await fetch(`${this.GRAPH_BASE_URL}/me/contacts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Microsoft contacts fetch error:', error);
      throw new Error(`Failed to fetch Microsoft contacts: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  // Get Google user info
  static async getGoogleUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Google user info: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
    };
  }

  // Get Google contacts
  static async getGoogleContacts(accessToken: string): Promise<GoogleContact[]> {
    const response = await fetch(`${this.GOOGLE_PEOPLE_BASE_URL}/people/me/connections?personFields=names,emailAddresses,organizations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Google contacts fetch error:', error);
      throw new Error(`Failed to fetch Google contacts: ${response.statusText}`);
    }

    const data = await response.json();
    return data.connections || [];
  }

  // Create calendar event in Microsoft Graph
  static async createMicrosoftEvent(
    accessToken: string,
    calendarId: string,
    event: Partial<OfficeCalendarEvent>
  ): Promise<OfficeCalendarEvent> {
    const response = await fetch(`${this.GRAPH_BASE_URL}/me/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Microsoft event: ${error}`);
    }

    return await response.json();
  }

  // Create calendar event in Google Calendar
  static async createGoogleEvent(
    accessToken: string,
    calendarId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    const response = await fetch(`${this.GOOGLE_CALENDAR_BASE_URL}/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Google event: ${error}`);
    }

    return await response.json();
  }

  // Get calendar events from Microsoft Graph
  static async getMicrosoftEvents(
    accessToken: string,
    calendarId: string,
    startTime?: string,
    endTime?: string
  ): Promise<OfficeCalendarEvent[]> {
    let url = `${this.GRAPH_BASE_URL}/me/calendars/${calendarId}/events`;
    
    if (startTime && endTime) {
      url += `?$filter=start/dateTime ge '${startTime}' and end/dateTime le '${endTime}'`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  // Get calendar events from Google Calendar
  static async getGoogleEvents(
    accessToken: string,
    calendarId: string,
    startTime?: string,
    endTime?: string
  ): Promise<GoogleCalendarEvent[]> {
    let url = `${this.GOOGLE_CALENDAR_BASE_URL}/calendars/${calendarId}/events`;
    
    const params = new URLSearchParams();
    if (startTime) params.append('timeMin', startTime);
    if (endTime) params.append('timeMax', endTime);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Google events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  // Refresh Microsoft access token with proper tenant - handles both public and confidential clients
  static async refreshMicrosoftToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const authUrl = this.getGraphAuthUrl();
    
    // Try with client secret first (confidential client)
    let body = new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    // Add client secret if provided
    if (clientSecret && clientSecret.trim()) {
      body.append('client_secret', clientSecret);
    }
    
    let response = await fetch(`${authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    // If failed with client secret, try without (public client)
    if (!response.ok && clientSecret && clientSecret.trim()) {
      console.log('Trying public client refresh (without client_secret)...');
      
      body = new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      response = await fetch(`${authUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: body.toString(),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft token refresh failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  }

  // Refresh Google access token
  static async refreshGoogleToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token refresh failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  }

  // Refresh token if needed
  static async refreshTokenIfNeeded(user: User): Promise<void> {
    if (!user.officeRefreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = user.officeConnectionType === 'microsoft' 
      ? process.env.MICROSOFT_CLIENT_ID 
      : process.env.GOOGLE_CLIENT_ID;
    const clientSecret = user.officeConnectionType === 'microsoft' 
      ? process.env.MICROSOFT_CLIENT_SECRET 
      : process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId) {
      throw new Error('OAuth credentials not configured');
    }

    try {
      let tokenResponse;
      
      if (user.officeConnectionType === 'microsoft') {
        tokenResponse = await this.refreshMicrosoftToken(
          user.officeRefreshToken,
          clientId,
          clientSecret || ''
        );
      } else if (user.officeConnectionType === 'google') {
        tokenResponse = await this.refreshGoogleToken(
          user.officeRefreshToken,
          clientId,
          clientSecret || ''
        );
      } else {
        throw new Error('Unsupported connection type');
      }

      // Update user with new tokens
      await storage.updateUser(user.id, {
        officeAccessToken: tokenResponse.accessToken,
        officeRefreshToken: tokenResponse.refreshToken,
      });

    } catch (error) {
      console.error('Token refresh failed:', error);
      // Mark connection as error
      await storage.updateUser(user.id, {
        officeConnectionStatus: 'error',
      });
      throw error;
    }
  }

  // Check if user has valid office connection
  static hasValidConnection(user: User): boolean {
    return user.officeConnectionStatus === 'connected' && 
           !!user.officeAccessToken && 
           !!user.officeCalendarId;
  }

  // Sync booking to office calendar
  static async syncBookingToOffice(
    user: User,
    booking: {
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      location?: string;
      isPrivate?: boolean;
      attendees?: string[];
    }
  ): Promise<{ eventId: string; eventUrl?: string }> {
    if (!this.hasValidConnection(user)) {
      throw new Error('Office connection not available');
    }

    if (user.officeConnectionType === 'microsoft') {
      const event: Partial<OfficeCalendarEvent> = {
        subject: booking.title,
        body: {
          contentType: 'text',
          content: booking.description || '',
        },
        start: {
          dateTime: booking.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: booking.endTime.toISOString(),
          timeZone: 'UTC',
        },
        location: booking.location ? { displayName: booking.location } : undefined,
        attendees: booking.attendees?.map(email => ({
          emailAddress: { address: email, name: email },
        })) || [],
        isPrivate: booking.isPrivate,
      };

      const result = await this.createMicrosoftEvent(
        user.officeAccessToken!,
        user.officeCalendarId!,
        event
      );

      return {
        eventId: result.id,
        eventUrl: result.onlineMeeting?.joinUrl,
      };
    } else if (user.officeConnectionType === 'google') {
      const event: Partial<GoogleCalendarEvent> = {
        summary: booking.title,
        description: booking.description || '',
        start: {
          dateTime: booking.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: booking.endTime.toISOString(),
          timeZone: 'UTC',
        },
        location: booking.location,
        attendees: booking.attendees?.map(email => ({
          email,
          displayName: email,
        })) || [],
        visibility: booking.isPrivate ? 'private' : 'public',
      };

      const result = await this.createGoogleEvent(
        user.officeAccessToken!,
        user.officeCalendarId!,
        event
      );

      return {
        eventId: result.id,
        eventUrl: result.hangoutLink,
      };
    }

    throw new Error(`Unsupported office connection type: ${user.officeConnectionType}`);
  }

  // Get office calendar events for conflict checking
  static async getOfficeEvents(
    user: User,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{ id: string; title: string; start: Date; end: Date }>> {
    if (!this.hasValidConnection(user)) {
      return [];
    }

    if (user.officeConnectionType === 'microsoft') {
      const events = await this.getMicrosoftEvents(
        user.officeAccessToken!,
        user.officeCalendarId!,
        startTime.toISOString(),
        endTime.toISOString()
      );

      return events.map(event => ({
        id: event.id,
        title: event.subject,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
      }));
    } else if (user.officeConnectionType === 'google') {
      const events = await this.getGoogleEvents(
        user.officeAccessToken!,
        user.officeCalendarId!,
        startTime.toISOString(),
        endTime.toISOString()
      );

      return events.map(event => ({
        id: event.id,
        title: event.summary,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
      }));
    }

    return [];
  }
}