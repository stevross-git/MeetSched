import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Users, Video, CheckCircle } from "lucide-react";
import type { Booking, Contact } from "@shared/schema";

export default function TodaySchedule() {
  const { data: todayBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/today"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const getContactName = (contactId: number | null) => {
    if (!contactId) return "";
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : "";
  };

  const formatTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return `${start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  };

  const getEventIcon = (type: string, location?: string) => {
    if (location?.toLowerCase().includes("zoom") || location?.toLowerCase().includes("video")) {
      return <Video className="text-gray-400" size={16} />;
    }
    return <Users className="text-gray-400" size={16} />;
  };

  const getEventColor = (status: string, index: number) => {
    if (status === "confirmed") return "bg-emerald-500";
    
    const colors = ["bg-blue-600", "bg-purple-600", "bg-green-500"];
    return colors[index % colors.length];
  };

  const isRecentlyScheduled = (booking: Booking) => {
    const bookingTime = new Date(booking.startTime);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - bookingTime.getTime()) / (1000 * 60 * 60);
    return diffHours < 24; // Consider as "just scheduled" if within 24 hours
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
      
      <div className="space-y-3">
        {todayBookings.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No events scheduled for today</p>
            <p className="text-xs mt-1">Ask the AI assistant to schedule something!</p>
          </div>
        ) : (
          todayBookings.map((booking, index) => {
            const isRecent = isRecentlyScheduled(booking);
            const contactName = getContactName(booking.contactId);
            
            return (
              <div
                key={booking.id}
                className={`flex items-center space-x-3 p-3 rounded-lg ${
                  isRecent 
                    ? "bg-emerald-50 border border-emerald-200" 
                    : "bg-gray-50"
                }`}
              >
                <div className={`w-2 h-8 ${getEventColor(booking.status, index)} rounded-full`}></div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{booking.title}</div>
                  <div className="text-sm text-gray-500">
                    {formatTime(booking.startTime, booking.endTime)}
                    {contactName && (
                      <span className="ml-2">• with {contactName}</span>
                    )}
                  </div>
                  {isRecent && (
                    <div className="text-xs text-emerald-600 font-medium mt-1">
                      Just Scheduled
                    </div>
                  )}
                </div>
                {isRecent ? (
                  <CheckCircle className="text-emerald-500" size={20} />
                ) : (
                  getEventIcon(booking.type, booking.location)
                )}
              </div>
            );
          })
        )}
      </div>
      
      <button className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center space-x-1">
        <span>View Full Calendar</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
