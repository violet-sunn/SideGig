// Navigation utilities that preserve impersonation state only for specific admin flows

export function buildUrl(path: string, preserveImpersonation = false): string {
  const url = new URL(path, window.location.origin);
  
  // Only preserve impersonation if explicitly requested or navigating to admin pages
  if (preserveImpersonation || path.startsWith('/admin')) {
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