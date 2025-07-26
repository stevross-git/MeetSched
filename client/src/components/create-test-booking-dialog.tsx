import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Users, MapPin, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreateTestBookingDialogProps {
  trigger?: React.ReactNode;
}

export function CreateTestBookingDialog({ trigger }: CreateTestBookingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("meeting");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: {
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      location?: string;
      type: string;
    }) => {
      const response = await apiRequest("POST", "/api/bookings", bookingData);
      return response.json();
    },
    onSuccess: (newBooking) => {
      // Refresh bookings data
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      // Close dialog and reset form
      setIsOpen(false);
      resetForm();
      
      toast({
        title: "Test booking created",
        description: `"${newBooking.title}" has been added to your calendar.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create booking",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setType("meeting");
  };

  const generateDefaultTimes = () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    const endDate = new Date(startDate.getTime() + 60 * 60000); // 1 hour duration
    
    const formatDateTime = (date: Date) => {
      return date.toISOString().slice(0, 16);
    };
    
    setStartTime(formatDateTime(startDate));
    setEndTime(formatDateTime(endDate));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a booking title.",
        variant: "destructive",
      });
      return;
    }

    if (!startTime || !endTime) {
      toast({
        title: "Time required",
        description: "Please select start and end times.",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      startTime,
      endTime,
      location: location.trim() || undefined,
      type,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !startTime && !endTime) {
      generateDefaultTimes();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Create Test Booking
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create Test Booking
          </DialogTitle>
          <DialogDescription>
            Create a test booking to see how events appear in your calendar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Team Standup, Client Call"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              <FileText className="w-4 h-4 inline mr-1" />
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Optional meeting details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              <Users className="w-4 h-4 inline mr-1" />
              Event Type
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="call">Phone Call</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="coffee">Coffee Chat</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g., Conference Room A, Zoom, Office"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createBookingMutation.isPending}
              className="flex-1"
            >
              {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}