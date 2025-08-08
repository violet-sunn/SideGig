import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Get impersonation parameter from URL for development testing
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateId = urlParams.get('impersonate');
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user", { impersonate: impersonateId, timestamp: Date.now() }],
    retry: false,
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache
  });

  // Debug logging to see what user data we're getting
  if (user) {
    console.log('Frontend useAuth - User data:', {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      fullUser: user
    });
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
