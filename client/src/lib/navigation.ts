// Navigation utilities that preserve impersonation state only for specific admin flows

export function buildUrl(path: string, preserveImpersonation = false): string {
  const url = new URL(path, window.location.origin);
  
  // In development mode, always preserve impersonation unless explicitly disabled
  // In production, only preserve for admin pages or when explicitly requested
  const shouldPreserve = import.meta.env.DEV ? 
    preserveImpersonation !== false : // dev: preserve by default
    (preserveImpersonation || path.startsWith('/admin')); // prod: only when requested or admin
  
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