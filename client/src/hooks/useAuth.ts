import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  // Get impersonation parameter from URL for development testing
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateId = urlParams.get('impersonate');
  
  // Only use impersonation in development and when explicitly set
  // Use import.meta.env.DEV instead of process.env.NODE_ENV for more reliable detection
  const isDevelopment = import.meta.env.DEV;
  const shouldImpersonate = isDevelopment && impersonateId;
  
  // Clean up impersonation parameter from URL if we're in production
  if (!isDevelopment && impersonateId) {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('impersonate');
    window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
  }
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: shouldImpersonate ? ["/api/auth/user", { impersonate: impersonateId }] : ["/api/auth/user"],
    retry: false,
    // Lower staleTime for auth data to ensure fresh user role data
    staleTime: 2 * 60 * 1000, // 2 minutes for auth data
    // Refetch on focus to catch role changes
    refetchOnWindowFocus: true,
  });

  // Debug logging and cache invalidation for role change investigation
  if (user) {
    const userKey = `lastKnownRole_${user.id}`;
    const lastKnownRole = localStorage.getItem(userKey);
    
    if (lastKnownRole && lastKnownRole !== user.role) {
      console.warn(`[useAuth] ROLE CHANGE DETECTED for user ${user.id}:`, {
        from: lastKnownRole,
        to: user.role,
        userInfo: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      
      // Clear all caches when role changes unexpectedly
      queryClient.clear();
    }
    
    // Update stored role
    localStorage.setItem(userKey, user.role);
    
    if (isDevelopment) {
      console.log(`[useAuth] User data:`, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        shouldImpersonate,
        impersonateId,
        queryKey: shouldImpersonate ? ["/api/auth/user", { impersonate: impersonateId }] : ["/api/auth/user"]
      });
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
