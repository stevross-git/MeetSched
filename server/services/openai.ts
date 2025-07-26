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
  const prompt = `
Based on the booking intent and existing calendar data, suggest 2-3 optimal time slots.

Booking Intent: ${JSON.stringify(intent)}
Existing Bookings: ${JSON.stringify(existingBookings)}

Consider:
- The preferred day/time mentioned
- Avoiding conflicts with existing bookings
- Standard business hours (9 AM - 6 PM)
- Buffer time between meetings (15 minutes)

Return JSON with suggested time slots:
{
  "timeSlots": [
    {
      "start": "2024-01-15T10:30:00.000Z",
      "end": "2024-01-15T11:30:00.000Z", 
      "label": "Monday, Jan 15 at 10:30 AM"
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
    
    // Fallback: generate basic time slots
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 30, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 30, 0, 0);
    
    return {
      timeSlots: [
        {
          start: tomorrow,
          end: endTime,
          label: tomorrow.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric'
          }) + ' at 10:30 AM'
        }
      ]
    };
  }
}
