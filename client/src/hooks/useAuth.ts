import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Get impersonation parameter from URL for development testing
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateId = urlParams.get('impersonate');
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user", { impersonate: impersonateId }],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
