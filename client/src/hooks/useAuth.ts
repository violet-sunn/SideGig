import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Get impersonation parameter from URL for development testing
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateId = urlParams.get('impersonate');
  
  // Only use impersonation in development and when explicitly set
  const shouldImpersonate = process.env.NODE_ENV === 'development' && impersonateId;
  
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
