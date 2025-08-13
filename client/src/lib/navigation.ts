// Navigation utilities that preserve impersonation state only for specific admin flows

export function buildUrl(path: string, preserveParams = true): string {
  const url = new URL(path, window.location.origin);
  
  if (preserveParams) {
    const currentParams = new URLSearchParams(window.location.search);
    
    if (import.meta.env.DEV) {
      // SECURITY: In development, preserve all parameters including impersonation
      currentParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    } else {
      // SECURITY: In production, preserve safe parameters but NEVER impersonation
      currentParams.forEach((value, key) => {
        // Only preserve non-security-sensitive parameters
        if (key !== 'impersonate') {
          url.searchParams.set(key, value);
        }
      });
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