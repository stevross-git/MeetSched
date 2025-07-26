import OpenAI from "openai";
import { BookingIntent, bookingIntentSchema } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function parseBookingIntent(userMessage: string): Promise<BookingIntent> {
  const prompt = `
You are a personal AI scheduling assistant. Parse the following booking request and return structured JSON data.

User message: "${userMessage}"

Extract the following information and return it as JSON:
- event_type: What type of event/meeting (e.g., "meeting", "lunch", "call", "appointment")
- preferred_day: The day mentioned (e.g., "Monday", "next Tuesday", "tomorrow")
- preferred_time: Specific time mentioned (e.g., "10:30 AM", "afternoon")
- time_window: Time range or window (e.g., "after 2pm", "morning", "evening")
- location: Location mentioned (e.g., "conference room", "Zoom", "coffee shop")
- duration_minutes: Estimated duration in minutes (default 60 if not specified)
- invitees: Array of people mentioned by name
- notes: Any additional context or requirements

Return only valid JSON in this exact format:
{
  "event_type": "string",
  "preferred_day": "string or null",
  "preferred_time": "string or null", 
  "time_window": "string or null",
  "location": "string or null",
  "duration_minutes": number,
  "invitees": ["string array"],
  "notes": "string or null"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a scheduling assistant that extracts booking information from natural language and returns valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);
    return bookingIntentSchema.parse(parsed);
  } catch (error) {
    console.error("Error parsing booking intent:", error);
    throw new Error("Failed to parse booking request. Please try rephrasing your message.");
  }
}

export async function generateTimeSlotSuggestions(
  intent: BookingIntent,
  existingBookings: any[],
  contactAvailability?: any
): Promise<{ timeSlots: Array<{ start: Date; end: Date; label: string }> }> {
  
  // If user specified a preferred time, try to honor it exactly
  if (intent.preferred_time) {
    const now = new Date();
    const suggestedTime = new Date();
    
    // Parse the preferred time - handle common formats
    let hours = 14; // Default to 2pm if parsing fails
    let minutes = 0;
    
    // Enhanced time parsing to handle various formats
    const timeStr = intent.preferred_time.toLowerCase();
    
    // Handle specific common cases first
    if (timeStr.includes('11am') || timeStr.includes('11:00 am')) {
      hours = 11;
    } else if (timeStr.includes('2pm') || timeStr.includes('2:00 pm')) {
      hours = 14;
    } else {
      // General parsing with improved regex
      const timeMatch = intent.preferred_time.match(/(\d{1,2}):?(\d{0,2})?\s*(am|pm)/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3].toLowerCase();
        
        if (ampm === 'pm' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'am' && hours === 12) {
          hours = 0;
        }
        // For AM times, keep hours as is (unless it's 12am = 0)
      } else {
        // Fallback - try to extract just the number
        const numberMatch = intent.preferred_time.match(/(\d{1,2})/);
        if (numberMatch) {
          hours = parseInt(numberMatch[1]);
          // If time seems like it should be AM (reasonable morning hours)
          if (hours >= 6 && hours <= 11) {
            // Keep as AM
          } else if (hours >= 1 && hours <= 5) {
            // Could be PM
            hours += 12;
          }
        }
      }
    }
    
    suggestedTime.setHours(hours, minutes, 0, 0);
    
    // Handle day preferences
    const dayStr = intent.preferred_day?.toLowerCase() || '';
    
    if (dayStr.includes('tomorrow')) {
      suggestedTime.setDate(now.getDate() + 1);
    } else if (dayStr.includes('tuesday')) {
      const currentDay = now.getDay();
      let daysUntilTuesday = (2 - currentDay + 7) % 7;
      if (daysUntilTuesday === 0) daysUntilTuesday = 7;
      suggestedTime.setDate(now.getDate() + daysUntilTuesday);
    } else if (dayStr.includes('saturday') || dayStr.includes('satru')) { // Handle typo "satruday"
      const currentDay = now.getDay();
      let daysUntilSaturday = (6 - currentDay + 7) % 7;
      if (daysUntilSaturday === 0) daysUntilSaturday = 7;
      suggestedTime.setDate(now.getDate() + daysUntilSaturday);
    } else {
      // Default to tomorrow if no specific day mentioned
      suggestedTime.setDate(now.getDate() + 1);
    }
    
    const endTime = new Date(suggestedTime);
    endTime.setMinutes(endTime.getMinutes() + intent.duration_minutes);
    
    return {
      timeSlots: [
        {
          start: suggestedTime,
          end: endTime,
          label: suggestedTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric'
          }) + ' at ' + suggestedTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }
      ]
    };
  }

  const prompt = `
Based on the booking intent and existing calendar data, suggest 2-3 optimal time slots that CLOSELY MATCH the user's preferred time and day.

Current date/time: ${new Date().toISOString()}
Booking Intent: ${JSON.stringify(intent)}
Existing Bookings: ${JSON.stringify(existingBookings)}

IMPORTANT RULES:
- If user specifies a time like "2pm", suggest times AROUND that time (1:30pm, 2:00pm, 2:30pm)
- If user says "Tuesday", suggest times on Tuesday
- Use the current year (2025) and month
- Times should be in 24-hour format for the ISO string
- Standard business hours are 9 AM - 6 PM
- Buffer time between meetings (15 minutes)

Return JSON with suggested time slots:
{
  "timeSlots": [
    {
      "start": "2025-07-29T14:00:00.000Z",
      "end": "2025-07-29T15:00:00.000Z", 
      "label": "Tuesday, Jul 29 at 2:00 PM"
    }
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "You are a smart scheduling assistant that suggests optimal meeting times based on preferences and availability."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);
    
    // Convert string dates to Date objects
    const timeSlots = parsed.timeSlots.map((slot: any) => ({
      ...slot,
      start: new Date(slot.start),
      end: new Date(slot.end)
    }));

    return { timeSlots };
  } catch (error) {
    console.error("Error generating time slots:", error);
    
    // Fallback: generate basic time slots that match user intent
    const fallbackDate = new Date();
    
    // If user mentioned a specific day, try to honor it
    if (intent.preferred_day?.toLowerCase().includes('tuesday')) {
      const daysUntilTuesday = (2 - fallbackDate.getDay() + 7) % 7;
      fallbackDate.setDate(fallbackDate.getDate() + (daysUntilTuesday || 7));
    } else {
      fallbackDate.setDate(fallbackDate.getDate() + 1); // Tomorrow
    }
    
    // If user mentioned a time, try to honor it
    let fallbackHour = 10;
    if (intent.preferred_time?.includes('2pm') || intent.preferred_time?.includes('14:')) {
      fallbackHour = 14;
    } else if (intent.preferred_time?.includes('pm')) {
      const hourMatch = intent.preferred_time.match(/(\d{1,2})/);
      if (hourMatch) {
        fallbackHour = parseInt(hourMatch[1]) + 12;
        if (fallbackHour === 24) fallbackHour = 12;
      }
    }
    
    fallbackDate.setHours(fallbackHour, 0, 0, 0);
    
    const endTime = new Date(fallbackDate);
    endTime.setMinutes(endTime.getMinutes() + intent.duration_minutes);
    
    return {
      timeSlots: [
        {
          start: fallbackDate,
          end: endTime,
          label: fallbackDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric'
          }) + ' at ' + fallbackDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }
      ]
    };
  }
}
