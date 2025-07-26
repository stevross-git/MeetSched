import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  LogOut, 
  Settings, 
  Shield, 
  Link as LinkIcon,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserMenuProps {
  user: any;
  token: string;
  onLogout: () => void;
}

export function UserMenu({ user, token, onLogout }: UserMenuProps) {
  const [isPrivateMode, setIsPrivateMode] = useState(user?.isPrivateMode || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for connection success in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const officeConnected = urlParams.get('office_connected');
    const connectionType = urlParams.get('type');
    const calendarName = urlParams.get('calendar');
    const error = urlParams.get('error');

    if (officeConnected === 'true' && connectionType) {
      toast({
        title: "Office Connected!",
        description: `Successfully connected ${connectionType === 'microsoft' ? 'Microsoft Outlook' : 'Google Calendar'}${calendarName ? ` (${decodeURIComponent(calendarName)})` : ''}`,
      });
      
      // Refresh user data to show updated connection status
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect office calendar: ${decodeURIComponent(error)}`,
        variant: "destructive",
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, queryClient]);

  // Get office connection status
  const { data: officeStatus } = useQuery({
    queryKey: ["/api/office/status"],
    enabled: !!user && !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get user stats
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    enabled: !!user && !!token,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      onLogout();
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    },
    onError: () => {
      // Still logout locally even if server request fails
      onLogout();
    },
  });

  const privacyMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      const response = await fetch("/api/user/privacy", {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ isPrivateMode: isPrivate }),
      });
      if (!response.ok) {
        throw new Error('Privacy update failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsPrivateMode(data.user.isPrivateMode);
      toast({
        title: "Privacy updated",
        description: `Private mode is now ${data.user.isPrivateMode ? "enabled" : "disabled"}.`,
      });
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update privacy settings.",
        variant: "destructive",
      });
    },
  });

  const connectOfficeMutation = useMutation({
    mutationFn: async (type: 'microsoft' | 'google') => {
      const response = await fetch("/api/office/connect", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        throw new Error('Office connection failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        // Open in same window to handle OAuth flow
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to initiate office connection.",
        variant: "destructive",
      });
    },
  });

  const syncOfficeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/office/sync", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
      });
      if (!response.ok) {
        throw new Error('Office sync failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: data.message || "Calendar and contacts synchronized successfully",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/office/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync office data.",
        variant: "destructive",
      });
    },
  });

  const disconnectOfficeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/office/disconnect", {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
      });
      if (!response.ok) {
        throw new Error('Office disconnection failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Office Disconnected",
        description: "Your office calendar has been disconnected.",
      });
      // Refresh user data and office status
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/office/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection failed",
        description: error.message || "Failed to disconnect office calendar.",
        variant: "destructive",
      });
    },
  });

  const handlePrivacyToggle = () => {
    const newValue = !isPrivateMode;
    privacyMutation.mutate(newValue);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getConnectionStatus = () => {
    const status = officeStatus || { 
      connected: user.officeConnectionStatus === 'connected', 
      type: user.officeConnectionType,
      status: user.officeConnectionStatus 
    };

    if (status.connected && status.type) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          {status.type === 'microsoft' ? 'Outlook' : 'Google'} Connected
        </Badge>
      );
    } else if (status.status === 'error') {
      return (
        <Badge variant="outline" className="text-red-600 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Connection Error
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-gray-500">
          <AlertCircle className="w-3 h-3 mr-1" />
          No Office Connection
        </Badge>
      );
    }
  };

  const isConnected = officeStatus?.connected || user.officeConnectionStatus === 'connected';
  const connectionType = officeStatus?.type || user.officeConnectionType;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          {isConnected && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="pt-1">
              {getConnectionStatus()}
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPrivateMode ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span className="text-sm">Private Mode</span>
            </div>
            <Switch
              checked={isPrivateMode}
              onCheckedChange={handlePrivacyToggle}
              disabled={privacyMutation.isPending}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Hide your bookings from others
          </p>
        </div>

        <DropdownMenuSeparator />
        
        {isConnected ? (
          <>
            <DropdownMenuItem className="flex-col items-start">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {connectionType === 'microsoft' ? 'Outlook' : 'Google Calendar'} Connected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncOfficeMutation.mutate()}
                  disabled={syncOfficeMutation.isPending}
                  className="h-6 w-6 p-0"
                  title="Sync Now"
                >
                  <RefreshCw className={`w-3 h-3 ${syncOfficeMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {stats && (
                <div className="text-xs text-muted-foreground mt-1 w-full">
                  {stats.syncedBookings} events, {stats.syncedContacts} contacts synced
                </div>
              )}
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => syncOfficeMutation.mutate()}
              disabled={syncOfficeMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncOfficeMutation.isPending ? 'animate-spin' : ''}`} />
              {syncOfficeMutation.isPending ? "Syncing..." : "Sync Calendar & Contacts"}
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => disconnectOfficeMutation.mutate()}
              disabled={disconnectOfficeMutation.isPending}
              className="text-red-600"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {disconnectOfficeMutation.isPending ? "Disconnecting..." : "Disconnect Calendar"}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => connectOfficeMutation.mutate('microsoft')}
              disabled={connectOfficeMutation.isPending}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Connect Outlook
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => connectOfficeMutation.mutate('google')}
              disabled={connectOfficeMutation.isPending}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
          <LogOut className="w-4 h-4 mr-2" />
          {logoutMutation.isPending ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}