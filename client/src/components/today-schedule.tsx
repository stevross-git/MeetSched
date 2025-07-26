import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Users, Video, CheckCircle, ExternalLink, Calendar, Clock, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Booking, Contact } from "@shared/schema";

interface EnhancedBooking extends Booking {
  _syncStatus?: string;
  _syncType?: string;
}

export default function TodaySchedule() {
  const { data: todayBookings = [] } = useQuery<EnhancedBooking[]>({
    queryKey: ["/api/bookings/today"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
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

  const getEventIcon = (booking: EnhancedBooking) => {
    if (booking.officeEventUrl || booking.location?.toLowerCase().includes("teams") || booking.location?.toLowerCase().includes("zoom")) {
      return <Video className="text-blue-500" size={16} />;
    }
    if (booking.location?.toLowerCase().includes("room") || booking.location?.toLowerCase().includes("office")) {
      return <MapPin className="text-green-500" size={16} />;
    }
    return <Users className="text-gray-400" size={16} />;
  };

  const getEventColor = (booking: EnhancedBooking, index: number) => {
    if (booking.status === "confirmed") return "bg-emerald-500";
    if (booking.officeEventId) return "bg-blue-500"; // Office synced events
    
    const colors = ["bg-purple-600", "bg-green-500", "bg-orange-500"];
    return colors[index % colors.length];
  };

  const isRecentlyScheduled = (booking: EnhancedBooking) => {
    // Check if booking was created recently (last 24 hours)
    // Since we don't have createdAt, we'll use a simple heuristic
    return booking._syncStatus === 'success' || booking.status === 'scheduled';
  };

  const getEventBadges = (booking: EnhancedBooking) => {
    const badges = [];
    
    if (booking.officeEventId) {
      badges.push(
        <Badge key="office" variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          <Building className="w-3 h-3 mr-1" />
          {booking._syncType === 'microsoft' ? 'Outlook' : 'Office'}
        </Badge>
      );
    }
    
    if (booking.isPrivate) {
      badges.push(
        <Badge key="private" variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
          Private
        </Badge>
      );
    }
    
    if (booking.officeEventUrl) {
      badges.push(
        <Badge key="online" variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
          Online
        </Badge>
      );
    }
    
    return badges;
  };

  const sortedBookings = [...todayBookings].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
        {stats && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{stats.syncedBookings}/{stats.totalBookings} synced</span>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {sortedBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium">No events scheduled for today</p>
            <p className="text-xs mt-1 mb-4">Ask the AI assistant to schedule something!</p>
            <div className="flex justify-center space-x-2">
              <Button variant="outline" size="sm">
                <Clock className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        ) : (
          <>
            {sortedBookings.map((booking, index) => {
              const isRecent = isRecentlyScheduled(booking);
              const contactName = getContactName(booking.contactId);
              const badges = getEventBadges(booking);
              const now = new Date();
              const eventStart = new Date(booking.startTime);
              const eventEnd = new Date(booking.endTime);
              const isOngoing = now >= eventStart && now <= eventEnd;
              const isUpcoming = eventStart > now;
              
              return (
                <div
                  key={booking.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg transition-all hover:shadow-sm ${
                    isRecent 
                      ? "bg-emerald-50 border border-emerald-200" 
                      : isOngoing
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className={`w-1 h-12 ${getEventColor(booking, index)} rounded-full flex-shrink-0`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">{booking.title}</h4>
                          {isOngoing && (
                            <Badge className="bg-red-500 text-white text-xs">
                              Live
                            </Badge>
                          )}
                          {isRecent && (
                            <Badge className="bg-emerald-500 text-white text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(booking.startTime, booking.endTime)}</span>
                          </div>
                          {contactName && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>with {contactName}</span>
                            </div>
                          )}
                        </div>
                        
                        {booking.location && (
                          <div className="flex items-center space-x-1 text-sm text-gray-500 mb-2">
                            <MapPin className="w-3 h-3" />
                            <span>{booking.location}</span>
                          </div>
                        )}
                        
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {badges}
                          </div>
                        )}
                        
                        {booking.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{booking.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-3">
                        {booking.officeEventUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(booking.officeEventUrl!, '_blank')}
                            className="text-blue-600 hover:text-blue-700"
                            title="Join Online Meeting"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        {getEventIcon(booking)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Summary */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-600">
                  <span>{sortedBookings.length} event{sortedBookings.length !== 1 ? 's' : ''} today</span>
                  {stats && stats.syncedBookings > 0 && (
                    <div className="flex items-center space-x-1">
                      <Building className="w-3 h-3 text-blue-500" />
                      <span className="text-blue-600">{stats.syncedBookings} synced</span>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  <span>View Full Calendar</span>
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}