import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bug, Calendar, Clock } from "lucide-react";

export function DebugBookings() {
  const { data: allBookings = [] } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const { data: todayBookings = [] } = useQuery({
    queryKey: ["/api/bookings/today"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const today = new Date();
  const todayStr = today.toDateString();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-500">
          <Bug className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Debug Information</DialogTitle>
          <DialogDescription>
            Debug information to help understand booking data flow
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Date Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Date Information</h3>
            <div className="text-sm space-y-1">
              <p><strong>Today:</strong> {todayStr}</p>
              <p><strong>ISO:</strong> {today.toISOString()}</p>
              <p><strong>Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Statistics</h3>
            <div className="text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
          </div>

          {/* Today's Bookings */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-900 mb-2">
              Today's Bookings ({todayBookings.length})
            </h3>
            <div className="text-sm">
              {todayBookings.length === 0 ? (
                <p className="text-gray-600">No bookings found for today</p>
              ) : (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(todayBookings, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* All Bookings */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900 mb-2">
              All Bookings ({allBookings.length})
            </h3>
            <div className="text-sm max-h-40 overflow-y-auto">
              {allBookings.length === 0 ? (
                <p className="text-gray-600">No bookings found</p>
              ) : (
                <div className="space-y-2">
                  {allBookings.map((booking: any) => (
                    <div key={booking.id} className="border border-purple-200 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{booking.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {booking.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <p><strong>Start:</strong> {new Date(booking.startTime).toLocaleString()}</p>
                        <p><strong>End:</strong> {new Date(booking.endTime).toLocaleString()}</p>
                        <p><strong>Date:</strong> {new Date(booking.startTime).toDateString()}</p>
                        <p><strong>Is Today:</strong> {new Date(booking.startTime).toDateString() === todayStr ? 'YES' : 'NO'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* API Endpoints Test */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Refresh Page
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  // Force refetch all queries
                  window.dispatchEvent(new Event('focus'));
                }}
                variant="outline"
              >
                Refetch Queries
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}