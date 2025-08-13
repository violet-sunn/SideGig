// Navigation utilities that preserve impersonation state only for specific admin flows

export function buildUrl(path: string, preserveImpersonation = false): string {
  const url = new URL(path, window.location.origin);
  
  // SECURITY: Only preserve impersonation in development mode
  // Production builds will NEVER preserve impersonation parameters
  const shouldPreserve = import.meta.env.DEV ? 
    preserveImpersonation !== false : // dev: preserve by default for testing
    false; // prod: NEVER preserve impersonation
  
  if (shouldPreserve) {
    const currentParams = new URLSearchParams(window.location.search);
    const impersonateParam = currentParams.get('impersonate');
    
    if (impersonateParam) {
      url.searchParams.set('impersonate', impersonateParam);
    }
  }
  
  return url.pathname + url.search;
}

export function getCurrentImpersonation(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('impersonate');
}

export function navigateTo(path: string) {
  window.location.href = buildUrl(path);
}