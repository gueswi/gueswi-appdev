import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "email" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  // Use whoami endpoint with bootstrap logic
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/whoami"],
    queryFn: async () => {
      console.log("🔍 API Base URL:", window.location.origin);
      
      const response = await fetch("/api/whoami", { credentials: "include" });
      
      if (response.status === 401) {
        return null; // Not authenticated
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      
      const userData: SelectUser = await response.json();
      
      // If user has no tenantId, trigger bootstrap
      if (!userData.tenantId) {
        console.log("🚀 User has no tenant, triggering bootstrap...");
        
        try {
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
        } catch (bootstrapError) {
          console.error("❌ Bootstrap failed:", bootstrapError);
        }
      }
      
      console.log("✅ User authenticated:", userData);
      return userData;
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/whoami"], user);
      // Trigger refetch to get updated user with tenantId
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error de inicio de sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/whoami"], user);
      // Trigger refetch to get updated user with tenantId
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/whoami"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        refetch,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
