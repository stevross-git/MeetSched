import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  EyeOff
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
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        toast({
          title: "Office connection",
          description: "Complete the authentication in the popup window.",
        });
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
    if (user.officeConnectionStatus === 'connected') {
      return (
        <Badge variant="outline" className="text-green-600">
          <LinkIcon className="w-3 h-3 mr-1" />
          {user.officeConnectionType === 'microsoft' ? 'Outlook' : 'Google'} Connected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-500">
        No Office Connection
      </Badge>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
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
        
        <DropdownMenuItem
          onClick={() => connectOfficeMutation.mutate('microsoft')}
          disabled={connectOfficeMutation.isPending || user.officeConnectionStatus === 'connected'}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Connect Outlook
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => connectOfficeMutation.mutate('google')}
          disabled={connectOfficeMutation.isPending || user.officeConnectionStatus === 'connected'}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Connect Google Calendar
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
          <LogOut className="w-4 h-4 mr-2" />
          {logoutMutation.isPending ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}