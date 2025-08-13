import { useLocation } from "wouter";
import { buildUrl } from "@/lib/navigation";

/**
 * Custom hook for navigation with optional impersonation preservation
 */
export function useNavigate() {
  const [, setLocation] = useLocation();
  
  return (path: string, preserveImpersonation = true) => {
    // Use buildUrl with impersonation preservation (default true in dev)
    const urlWithParams = buildUrl(path, preserveImpersonation);
    setLocation(urlWithParams);
  };
}