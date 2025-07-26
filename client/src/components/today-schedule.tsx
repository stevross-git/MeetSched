import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowRight, 
  Users, 
  Video, 
  CheckCircle, 
  ExternalLink, 
  Calendar, 
  Clock, 
  MapPin, 
  Building,
  Phone,
  Coffee,
  Briefcase,
  Heart,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreateTestBookingDialog } from "./create-test-booking-dialog";
import { DebugBookings } from "./debug-bookings";
import type { Booking, Contact } from "@shared/schema";

interface EnhancedBooking extends Booking {
  _syncStatus?: string;
  _syncType?: string;
  _isLive?: boolean;
  _timeUntil?: string;
}

export default function TodaySchedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todayBookings = [], isLoading, refetch } = useQuery<EnhancedBooking[]>({
    queryKey: ["/api/bookings/today"],
    refetchInterval: 30000, // Refresh every 30 seconds for live updates
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Mutation to update booking status
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/bookings/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Booking updated",
        description: "The booking status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update booking status.",
        variant: "destructive",
      });
    },
  });

  const getContactName = (contactId: number | null) => {
    if (!contactId) return "";
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : "";
  };

  const getContactDetails = (contactId: number | null) => {
    if (!contactId) return null;
    return contacts.find(c => c.id === contactId);
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

  const getTimeUntilEvent = (startTime: string) => {
    const now = new Date();
    const eventStart = new Date(startTime);
    const diffMs = eventStart.getTime() - now.getTime();
    
    if (diffMs < 0) return "Started";
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `in ${diffHours}h ${diffMins % 60}m`;
    } else if (diffMins > 0) {
      return `in ${diffMins}m`;
    } else {
      return "Starting now";
    }
  };

  const getEventIcon = (booking: EnhancedBooking) => {
    // Check if it's a video meeting
    if (booking.officeEventUrl || 
        booking.location?.toLowerCase().includes("teams") || 
        booking.location?.toLowerCase().includes("zoom") ||
        booking.location?.toLowerCase().includes("meet")) {
      return <Video className="text-blue-500" size={16} />;
    }
    
    // Check location type
    if (booking.location?.toLowerCase().includes("room") || 
        booking.location?.toLowerCase().includes("office")) {
      return <MapPin className="text-green-500" size={16} />;
    }
    
    // Check by event type
    switch (booking.type) {
      case 'call':
        return <Phone className="text-purple-500" size={16} />;
      case 'meeting':
        return <Users className="text-blue-500" size={16} />;
      case 'appointment':
        return <Calendar className="text-orange-500" size={16} />;
      case 'lunch':
      case 'dinner':
      case 'coffee':
        return <Coffee className="text-amber-500" size={16} />;
      case 'interview':
        return <Briefcase className="text-indigo-500" size={16} />;
      case 'personal':
        return <Heart className="text-pink-500" size={16} />;
      default:
        return <Users className="text-gray-400" size={16} />;
    }
  };

  const getEventColor = (booking: EnhancedBooking, index: number) => {
    if (booking.status === "cancelled") return "bg-red-300";
    if (booking._isLive) return "bg-red-500";
    if (booking.status === "confirmed") return "bg-green-500";
    
    // Color rotation for visual variety
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-indigo-500", 
      "bg-cyan-500", "bg-teal-500", "bg-emerald-500",
      "bg-orange-500", "bg-amber-500"
    ];
    return colors[index % colors.length];
  };

  const getEventBadges = (booking: EnhancedBooking) => {
    const badges = [];
    
    if (booking.isPrivate) {
      badges.push(
        <Badge key="private" variant="secondary" className="text-xs">
          <Eye className="w-3 h-3 mr-1" />
          Private
        </Badge>
      );
    }
    
    if (booking.officeEventId) {
      badges.push(
        <Badge key="synced" variant="outline" className="text-xs text-blue-600 border-blue-300">
          <Building className="w-3 h-3 mr-1" />
          Synced
        </Badge>
      );
    }
    
    return badges;
  };

  const isRecentlyScheduled = (booking: EnhancedBooking) => {
    if (!booking.id) return false;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    // Since we don't have createdAt, we'll use a simple heuristic
    return booking.id > 0; // Placeholder logic
  };

  // Enrich bookings with real-time data
  const enrichedBookings = todayBookings.map((booking, index) => {
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    
    const isLive = now >= startTime && now <= endTime;
    const timeUntil = getTimeUntilEvent(booking.startTime);
    
    return {
      ...booking,
      _isLive: isLive,
      _timeUntil: timeUntil,
      _syncStatus: booking.officeEventId ? "synced" : "local",
      _syncType: booking.officeEventId ? "office" : "manual"
    };
  });

  // Sort bookings by start time
  enrichedBookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
          <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex space-x-3">
                <div className="w-1 h-16 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
        <div className="flex items-center space-x-2">
          <DebugBookings />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="text-gray-600 hover:text-gray-900"
          >
            <Clock className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {enrichedBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium">No events scheduled for today</p>
            <p className="text-xs mt-1 mb-4">Perfect day for a fresh start!</p>
            <div className="flex justify-center space-x-2">
              <CreateTestBookingDialog 
                trigger={
                  <Button variant="outline" size="sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Create Test Booking
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <>
            {enrichedBookings.map((booking, index) => {
              const isRecent = isRecentlyScheduled(booking);
              const contactName = getContactName(booking.contactId);
              const contactDetails = getContactDetails(booking.contactId);
              const badges = getEventBadges(booking);
              const isUpcoming = new Date(booking.startTime) > new Date();
              
              return (
                <div
                  key={booking.id}
                  className={`relative flex items-start space-x-3 p-4 rounded-lg transition-all hover:shadow-sm ${
                    isRecent 
                      ? "bg-emerald-50 border border-emerald-200" 
                      : booking._isLive
                      ? "bg-blue-50 border border-blue-200"
                      : booking.status === 'cancelled'
                      ? "bg-red-50 border border-red-200 opacity-75"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {/* Time indicator bar */}
                  <div className={`w-1 h-16 ${getEventColor(booking, index)} rounded-full flex-shrink-0`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Title and Live/New badges */}
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">{booking.title}</h4>
                          {booking._isLive && (
                            <Badge className="bg-red-500 text-white text-xs animate-pulse">
                              Live
                            </Badge>
                          )}
                          {isRecent && !booking._isLive && (
                            <Badge className="bg-emerald-500 text-white text-xs">
                              New
                            </Badge>
                          )}
                          {booking.status === 'cancelled' && (
                            <Badge className="bg-red-500 text-white text-xs">
                              Cancelled
                            </Badge>
                          )}
                        </div>
                        
                        {/* Time and participant info */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(booking.startTime, booking.endTime)}</span>
                            {isUpcoming && (
                              <span className="text-blue-600 font-medium">
                                ({booking._timeUntil})
                              </span>
                            )}
                          </div>
                          {contactName && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>with {contactName}</span>
                              {contactDetails?.status === 'online' && (
                                <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Location */}
                        {booking.location && (
                          <div className="flex items-center space-x-1 text-sm text-gray-500 mb-2">
                            <MapPin className="w-3 h-3" />
                            <span>{booking.location}</span>
                          </div>
                        )}
                        
                        {/* Badges */}
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {badges}
                          </div>
                        )}
                        
                        {/* Description */}
                        {booking.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{booking.description}</p>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 ml-3">
                        {/* Join meeting button */}
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
                        
                        {/* Event type icon */}
                        <div className="p-1">
                          {getEventIcon(booking)}
                        </div>
                        
                        {/* More actions menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {/* TODO: Edit booking */}}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {booking.status !== 'confirmed' && (
                              <DropdownMenuItem 
                                onClick={() => updateBookingMutation.mutate({ id: booking.id, status: 'confirmed' })}
                                disabled={updateBookingMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Confirm
                              </DropdownMenuItem>
                            )}
                            {booking.status !== 'cancelled' && (
                              <DropdownMenuItem 
                                onClick={() => updateBookingMutation.mutate({ id: booking.id, status: 'cancelled' })}
                                disabled={updateBookingMutation.isPending}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Summary footer */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-600">
                  <span>{enrichedBookings.length} event{enrichedBookings.length !== 1 ? 's' : ''} today</span>
                  {stats && stats.syncedBookings > 0 && (
                    <div className="flex items-center space-x-1">
                      <Building className="w-3 h-3 text-blue-500" />
                      <span className="text-blue-600">{stats.syncedBookings} synced</span>
                    </div>
                  )}
                  {enrichedBookings.some(b => b._isLive) && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-600">Live event</span>
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