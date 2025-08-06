import { useState, useEffect } from "react";

export function useImpersonation() {
  const [impersonateId, setImpersonateId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const impersonate = urlParams.get('impersonate');
    setImpersonateId(impersonate);
  }, []);

  const preserveImpersonationInUrl = (url: string): string => {
    if (!impersonateId) return url;
    
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.set('impersonate', impersonateId);
    return urlObj.pathname + urlObj.search;
  };

  return {
    impersonateId,
    preserveImpersonationInUrl,
  };
}