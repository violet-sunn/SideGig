import { useLocation } from "wouter";
import { buildUrl } from "@/lib/navigation";

/**
 * Custom hook for navigation with optional impersonation preservation
 */
export function useNavigate() {
  const [, setLocation] = useLocation();
  
  return (path: string, preserveImpersonation = false) => {
    // Use buildUrl with optional impersonation preservation
    const urlWithParams = buildUrl(path, preserveImpersonation);
    setLocation(urlWithParams);
  };
}