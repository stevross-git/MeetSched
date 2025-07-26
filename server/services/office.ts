import { User } from '../../shared/schema';

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
  private static readonly GRAPH_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0';

  // Google Calendar API endpoints
  private static readonly GOOGLE_CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';
  private static readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

  // Generate OAuth URL for Microsoft
  static generateMicrosoftAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const scopes = [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/People.Read'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      response_mode: 'query'
    });

    return `${this.GRAPH_AUTH_URL}/authorize?${params.toString()}`;
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

  // Exchange authorization code for access token (Microsoft)
  static async exchangeMicrosoftCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const response = await fetch(`${this.GRAPH_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
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

  // Refresh Microsoft access token
  static async refreshMicrosoftToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const response = await fetch(`${this.GRAPH_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft token refresh failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Sometimes refresh token isn't returned
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

    if (user.officeConnectionType === 'outlook') {
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

    if (user.officeConnectionType === 'outlook') {
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