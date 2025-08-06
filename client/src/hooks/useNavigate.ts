import { useLocation } from "wouter";
import { navigateTo } from "@/lib/navigation";

/**
 * Custom hook for navigation that preserves impersonation parameters in development mode
 */
export function useNavigate() {
  const [, setLocation] = useLocation();
  
  return (path: string) => navigateTo(path, setLocation);
}