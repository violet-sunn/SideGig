import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

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
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
