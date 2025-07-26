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
  
  // Generate time slots using deterministic parsing (no AI)
  const now = new Date();
  const suggestedTime = new Date();
  
  // Parse time from user intent
  let hours = 12; // Default to noon
  let minutes = 0;
  
  const timeStr = intent.preferred_time?.toLowerCase() || '';
  
  if (timeStr.includes('12pm') || timeStr.includes('12:00 pm') || timeStr.includes('noon')) {
    hours = 12;
  } else if (timeStr.includes('12am') || timeStr.includes('12:00 am') || timeStr.includes('midnight')) {
    hours = 0;
  } else if (timeStr.includes('11am') || timeStr.includes('11:00 am')) {
    hours = 11;
  } else if (timeStr.includes('1pm') || timeStr.includes('1:00 pm')) {
    hours = 13;
  } else if (timeStr.includes('2pm') || timeStr.includes('2:00 pm')) {
    hours = 14;
  } else {
    // General parsing
    const timeMatch = intent.preferred_time?.match(/(\d{1,2}):?(\d{0,2})?\s*(am|pm)/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
    }
  }
  
  // Parse day from user intent
  const dayStr = intent.preferred_day?.toLowerCase() || '';
  
  if (dayStr.includes('tomorrow')) {
    suggestedTime.setDate(now.getDate() + 1);
  } else if (dayStr.includes('monday')) {
    const currentDay = now.getDay();
    let daysUntilMonday = (1 - currentDay + 7) % 7;
    if (daysUntilMonday === 0) daysUntilMonday = 7;
    suggestedTime.setDate(now.getDate() + daysUntilMonday);
  } else if (dayStr.includes('tuesday')) {
    const currentDay = now.getDay();
    let daysUntilTuesday = (2 - currentDay + 7) % 7;
    if (daysUntilTuesday === 0) daysUntilTuesday = 7;
    suggestedTime.setDate(now.getDate() + daysUntilTuesday);
  } else if (dayStr.includes('wednesday')) {
    const currentDay = now.getDay();
    let daysUntilWednesday = (3 - currentDay + 7) % 7;
    if (daysUntilWednesday === 0) daysUntilWednesday = 7;
    suggestedTime.setDate(now.getDate() + daysUntilWednesday);
  } else if (dayStr.includes('thursday')) {
    const currentDay = now.getDay();
    let daysUntilThursday = (4 - currentDay + 7) % 7;
    if (daysUntilThursday === 0) daysUntilThursday = 7;
    suggestedTime.setDate(now.getDate() + daysUntilThursday);
  } else if (dayStr.includes('friday')) {
    const currentDay = now.getDay();
    let daysUntilFriday = (5 - currentDay + 7) % 7;
    if (daysUntilFriday === 0) daysUntilFriday = 7;
    suggestedTime.setDate(now.getDate() + daysUntilFriday);
  } else if (dayStr.includes('saturday')) {
    const currentDay = now.getDay();
    let daysUntilSaturday = (6 - currentDay + 7) % 7;
    if (daysUntilSaturday === 0) daysUntilSaturday = 7;
    suggestedTime.setDate(now.getDate() + daysUntilSaturday);
  } else if (dayStr.includes('sunday')) {
    const currentDay = now.getDay();
    let daysUntilSunday = (0 - currentDay + 7) % 7;
    if (daysUntilSunday === 0) daysUntilSunday = 7;
    suggestedTime.setDate(now.getDate() + daysUntilSunday);
  } else {
    suggestedTime.setDate(now.getDate() + 1);
  }
  
  // Set the exact time requested
  suggestedTime.setHours(hours, minutes, 0, 0);
  
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
