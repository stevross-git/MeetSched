import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Calendar as CalendarIcon, Sync, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  type: string;
  status: string;
  isPrivate: boolean;
  isAllDay: boolean;
  officeEventId?: string;
  officeEventUrl?: string;
}

export default function CalendarWidget() {
  const { toast } = useToast();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  // Get calendar events for the current month
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const { data: events = [], isLoading, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", startOfMonth.toISOString(), endOfMonth.toISOString()],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/calendar/events?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`);
      return response.json();
    },
  });

  // Sync office data
  const syncOfficeData = async () => {
    try {
      const response = await apiRequest("POST", "/api/office/sync");
      const result = await response.json();
      
      toast({
        title: "Sync Complete",
        description: result.message || "Calendar and contacts synchronized successfully",
      });
      
      // Refresh calendar data
      refetch();
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync office data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate calendar days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    const prevMonth = new Date(currentYear, currentMonth - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    days.push({
      day: prevMonthDays - startingDayOfWeek + i + 1,
      isCurrentMonth: false,
      isToday: false,
      events: []
    });
  }

  // Add days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentMonth && 
             eventDate.getFullYear() === currentYear;
    });

    days.push({
      day,
      isCurrentMonth: true,
      isToday: day === currentDate,
      events: dayEvents
    });
  }

  // Add remaining days from next month to fill the grid
  const remainingDays = 42 - days.length; // 6 rows × 7 days = 42 total cells
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      day,
      isCurrentMonth: false,
      isToday: false,
      events: []
    });
  }

  const getEventColor = (event: CalendarEvent) => {
    if (event.officeEventId) {
      return "bg-blue-500"; // Office synced events
    }
    
    switch (event.type) {
      case 'meeting':
        return "bg-emerald-500";
      case 'appointment':
        return "bg-purple-500";
      case 'call':
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDayEventIndicators = (dayEvents: CalendarEvent[]) => {
    if (dayEvents.length === 0) return null;
    
    const maxIndicators = 3;
    const visibleEvents = dayEvents.slice(0, maxIndicators);
    const hiddenCount = dayEvents.length - maxIndicators;
    
    return (
      <div className="flex flex-wrap gap-0.5 mt-1">
        {visibleEvents.map((event, index) => (
          <div
            key={event.id}
            className={`w-1.5 h-1.5 rounded-full ${getEventColor(event)}`}
            title={event.title}
          />
        ))}
        {hiddenCount > 0 && (
          <div 
            className="w-1.5 h-1.5 rounded-full bg-gray-400"
            title={`+${hiddenCount} more events`}
          />
        )}
    );
}
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={syncOfficeData}
            className="text-blue-600 hover:text-blue-700"
            title="Sync with Office Calendar"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700"
            title="Open Full Calendar"
          >
            <ExternalLink size={16} />
          </Button>
        </div>
      </div>
      
      <div className="text-center mb-4">
        <div className="text-sm text-gray-500 mb-1">
          {monthNames[currentMonth]} {currentYear}
        </div>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div key={`day-header-${index}`} className="text-center py-1 font-medium">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-sm">
          {days.map((dayObj, index) => (
            <div
              key={index}
              className={`relative text-center py-2 rounded-lg font-medium cursor-pointer transition-colors min-h-[40px] flex flex-col justify-start ${
                !dayObj.isCurrentMonth
                  ? "text-gray-300"
                  : dayObj.isToday
                  ? "bg-blue-600 text-white"
                  : dayObj.events.length > 0
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={dayObj.events.length > 0 ? `${dayObj.events.length} event(s)` : ''}
            >
              <span className="text-xs">{dayObj.day}</span>
              {getDayEventIndicators(dayObj.events)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-gray-600">Events</span>
            </div>
          </div>
          {events.length > 0 && (
            <div className="text-gray-500">
              {events.length} event{events.length !== 1 ? 's' : ''} this month
            </div>
          )}
        </div>
        
        {/* Office sync indicator */}
        {events.some(e => e.officeEventId) && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Synced with Office Calendar</span>
            <Sync className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>