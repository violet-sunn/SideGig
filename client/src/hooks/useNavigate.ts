import { useLocation } from "wouter";
import { buildUrl } from "@/lib/navigation";

/**
 * Custom hook for navigation that preserves impersonation parameters in development mode
 */
export function useNavigate() {
  const [, setLocation] = useLocation();
  
  return (path: string) => {
    // Use buildUrl to preserve impersonation parameters
    const urlWithParams = buildUrl(path);
    setLocation(urlWithParams);
  };
}