import { useLocation } from "wouter";
import { navigateTo } from "@/lib/navigation";

/**
 * Custom hook for navigation that preserves impersonation parameters in development mode
 */
export function useNavigate() {
  const [, setLocation] = useLocation();
  
  return (path: string) => {
    if (process.env.NODE_ENV === 'development') {
      // Preserve impersonation in development
      navigateTo(path);
    } else {
      setLocation(path);
    }
  };
}