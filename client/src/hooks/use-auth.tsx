import { useState, useEffect, createContext, useContext } from "react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isPrivateMode: boolean;
  officeConnectionStatus: string;
  officeConnectionType?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        
        // Verify token is still valid
        validateToken(storedToken);
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      logout();
    }
  };

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("auth_token", authToken);
    localStorage.setItem("auth_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper hook to add auth headers to requests
export function useAuthenticatedRequest() {
  const { token } = useAuth();
  
  return (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    
    return fetch(url, { ...options, headers });
  };
}