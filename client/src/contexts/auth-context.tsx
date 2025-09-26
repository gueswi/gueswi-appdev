import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: string;
  email: string;
  role: "owner" | "admin" | "user";
  tenantId: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("🔍 AuthProvider: API Base URL =", window.location.origin);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      setError(null);
      const response = await fetch("/api/whoami", { 
        credentials: "include" 
      });

      if (response.status === 401) {
        return null; // Not authenticated
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const userData: User = await response.json();
      
      // If user has no tenantId, trigger bootstrap
      if (!userData.tenantId) {
        console.log("🚀 User has no tenant, triggering bootstrap...");
        
        // Make any authenticated API call to trigger bootstrap middleware
        await fetch("/api/dashboard/stats", { credentials: "include" });
        
        // Refetch user after bootstrap
        const retriedResponse = await fetch("/api/whoami", { 
          credentials: "include" 
        });
        
        if (retriedResponse.ok) {
          const retriedUserData = await retriedResponse.json();
          console.log("✅ Bootstrap completed, user updated:", retriedUserData);
          return retriedUserData;
        }
      }

      console.log("✅ User authenticated:", userData);
      return userData;
    } catch (err) {
      console.error("❌ Auth error:", err);
      throw err;
    }
  }, []);

  const refetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await fetchUser();
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      setUser(null);
      window.location.href = "/auth";
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  // Initial auth check on mount
  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const value = {
    user,
    isLoading,
    error,
    refetchUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}