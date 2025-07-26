import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bot, User, Mic, Send, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage, BookingIntent } from "@shared/schema";

interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

interface AIResponse {
  intent: BookingIntent;
  timeSlots: TimeSlot[];
  message: string;
}

export default function ChatInterface() {
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<{
    intent: BookingIntent;
    timeSlots: TimeSlot[];
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: { content: string; sender: "user" | "ai"; metadata?: any }) => {
      const response = await apiRequest("POST", "/api/chat/messages", message);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  const parseBookingMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/ai/parse-booking", { message });
      return response.json() as Promise<AIResponse>;
    },
    onSuccess: (data) => {
      setPendingBooking({
        intent: data.intent,
        timeSlots: data.timeSlots.map(slot => ({
          ...slot,
          start: new Date(slot.start),
          end: new Date(slot.end)
        }))
      });
      
      // Send AI response message
      sendMessageMutation.mutate({
        content: data.message,
        sender: "ai",
        metadata: { type: "time_slots", timeSlots: data.timeSlots }
      });
      
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("Booking parsing error:", error);
      toast({
        title: "Error",
        description: "Sorry, I couldn't understand your request. Please try rephrasing.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (booking: any) => {
      const response = await apiRequest("POST", "/api/bookings", booking);
      return response.json();
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/today"] });
      
      // Send confirmation message
      sendMessageMutation.mutate({
        content: `Perfect! I've booked your ${booking.type} for ${booking.title}. Calendar invite has been sent and the event is added to your calendar.`,
        sender: "ai",
        metadata: { type: "booking_confirmed", bookingId: booking.id }
      });
      
      setPendingBooking(null);
      
      toast({
        title: "Booking Confirmed",
        description: `${booking.title} has been scheduled successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: "Sorry, there was an error creating your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsProcessing(true);

    // Send user message
    await sendMessageMutation.mutateAsync({
      content: userMessage,
      sender: "user",
    });

    // Send typing indicator
    await sendMessageMutation.mutateAsync({
      content: "Analyzing your request...",
      sender: "ai",
      metadata: { type: "processing" }
    });

    // Parse booking intent
    parseBookingMutation.mutate(userMessage);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    if (!pendingBooking) return;

    const { intent } = pendingBooking;
    
    createBookingMutation.mutate({
      title: `${intent.event_type} ${intent.invitees.length > 0 ? `with ${intent.invitees.join(", ")}` : ""}`.trim(),
      description: intent.notes || "",
      startTime: timeSlot.start.toISOString(),
      endTime: timeSlot.end.toISOString(),
      type: intent.event_type,
      location: intent.location || "",
      status: "scheduled",
      contactId: null, // TODO: Link with actual contact
      isAllDay: false,
    });
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderMessage = (message: ChatMessage) => {
    if (message.sender === "ai") {
      const metadata = message.metadata as any;
      const isProcessing = metadata?.type === "processing";
      const isTimeSlots = metadata?.type === "time_slots";
      
      return (
        <div key={message.id} className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="text-white" size={14} />
          </div>
          <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: "0.1s"}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                </div>
                <span className="text-sm text-gray-600">{message.content}</span>
              </div>
            ) : (
              <>
                <p className="text-gray-800 mb-3">{message.content}</p>
                
                {isTimeSlots && pendingBooking && (
                  <div className="space-y-2">
                    {pendingBooking.timeSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleTimeSlotSelect(slot)}
                        className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all group"
                        disabled={createBookingMutation.isPending}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-blue-600">
                              {new Date(slot.start).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit', 
                                hour12: true,
                                timeZone: 'UTC'
                              })} - {new Date(slot.end).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit', 
                                hour12: true,
                                timeZone: 'UTC'
                              })}
                            </div>
                            <div className="text-sm text-gray-500">{slot.label}</div>
                          </div>
                          <CheckCircle className="text-gray-300 group-hover:text-emerald-500" size={20} />
                        </div>
                      </button>
                    ))}
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mt-3">
                      <CheckCircle className="text-blue-600" size={16} />
                      <span>These slots are available in your calendar</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div key={message.id} className="flex items-start space-x-3 justify-end">
          <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-4 py-3 max-w-md">
            <p className="text-white">{message.content}</p>
          </div>
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="text-gray-600" size={14} />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Booking Assistant</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Today</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell me what you'd like to schedule..."
              className="pr-12"
              disabled={isProcessing}
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 transition-colors">
              <Mic size={16} />
            </button>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send size={16} />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button 
            onClick={() => handleQuickAction("Meeting with team")}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            Meeting with team
          </button>
          <button 
            onClick={() => handleQuickAction("Lunch appointment")}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            Lunch appointment
          </button>
          <button 
            onClick={() => handleQuickAction("Doctor visit")}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            Doctor visit
          </button>
        </div>
      </div>
    </div>
  );
}
