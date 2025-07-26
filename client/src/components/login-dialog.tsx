import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogIn, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LoginDialogProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export function LoginDialog({ onLoginSuccess }: LoginDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      onLoginSuccess(data.user, data.token);
      setIsOpen(false);
      setEmail("");
      setName("");
      toast({
        title: "Welcome!",
        description: "You've successfully logged in to AI Book Me.",
      });
      // Invalidate all queries to refresh data with user context
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Failed to login. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast({
        title: "Required fields",
        description: "Please enter both your email and name.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email: email.trim(), name: name.trim() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LogIn className="w-4 h-4 mr-2" />
          Login
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Welcome to AI Book Me
          </DialogTitle>
          <DialogDescription>
            Enter your details to access your personal calendar and office connections.
            New users will be automatically registered.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 pt-4">
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
              disabled={loginMutation.isPending}
              className="flex-1"
            >
              {loginMutation.isPending ? "Logging in..." : "Get Started"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}