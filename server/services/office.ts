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

export class OfficeConnectionService {
  // Microsoft Graph API endpoints
  private static readonly GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

  // Google Calendar API endpoints
  private static readonly GOOGLE_CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';
  private static readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

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
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/office/callback';
      
      if (!clientId) {
        throw new Error('Microsoft client ID not configured. Please set MICROSOFT_CLIENT_ID in environment variables.');
      }
      
      return this.generateMicrosoftAuthUrl(clientId, redirectUri, state);
    } else if (type === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/office/callback';
      
      if (!clientId) {
        throw new Error('Google client ID not configured. Please set GOOGLE_CLIENT_ID in environment variables.');
      }
      
      return this.generateGoogleAuthUrl(clientId, redirectUri, state);
    }
    
    throw new Error('Unsupported connection type');
  }

  // Handle OAuth callback
  static async handleCallback(userId: string, type: 'microsoft' | 'google', code: string): Promise<any> {
    if (type === 'microsoft') {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/office/callback';

      if (!clientId) {
        throw new Error('Microsoft OAuth credentials not configured');
      }

      try {
        // Exchange code for tokens
        const tokenResponse = await this.exchangeMicrosoftCode(code, clientId, clientSecret || '', redirectUri);
        
        // Get user's primary calendar
        const calendars = await this.getMicrosoftCalendars(tokenResponse.accessToken);
        const primaryCalendar = calendars.find(cal => cal.isDefaultCalendar) || calendars[0];

        if (!primaryCalendar) {
          throw new Error('No calendar found');
        }

        // Update user with connection details
        await storage.updateUser(userId, {
          officeConnectionStatus: 'connected',
          officeConnectionType: 'microsoft',
          officeAccessToken: tokenResponse.accessToken,
          officeRefreshToken: tokenResponse.refreshToken,
          officeCalendarId: primaryCalendar.id,
        });

        return {
          type: 'microsoft',
          status: 'connected',
          calendarName: primaryCalendar.name,
          message: 'Microsoft Outlook connected successfully'
        };
      } catch (error) {
        console.error('Microsoft OAuth error:', error);
        throw new Error('Failed to connect Microsoft Outlook');
      }
    } else if (type === 'google') {
      // TODO: Implement Google OAuth
      throw new Error('Google Calendar integration not yet implemented');
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

  // Generate OAuth URL for Microsoft with proper tenant handling
  static generateMicrosoftAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const scopes = [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/People.Read'
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

    return `${authUrl}/authorize?${params.toString()}`;
  }

  // Generate OAuth URL for Google
  static generateGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
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
    
    // Try with client secret first (confidential client)
    let body = new URLSearchParams({
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    // Add client secret if provided
    if (clientSecret) {
      body.append('client_secret', clientSecret);
    }
    
    let response = await fetch(`${authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    // If failed with client secret, try without (public client)
    if (!response.ok && clientSecret) {
      console.log('Trying public client flow (without client_secret)...');
      
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
        },
        body: body.toString(),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('Microsoft token exchange error:', error);
      throw new Error(`Microsoft token exchange failed: ${response.status} ${response.statusText}`);
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
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
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
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Microsoft event: ${error}`);
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
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
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
    if (clientSecret) {
      body.append('client_secret', clientSecret);
    }
    
    let response = await fetch(`${authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    // If failed with client secret, try without (public client)
    if (!response.ok && clientSecret) {
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
    }

    return [];
  }
}