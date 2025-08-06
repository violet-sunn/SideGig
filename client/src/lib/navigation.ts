// Navigation utilities that preserve impersonation state

export function buildUrl(path: string): string {
  const url = new URL(path, window.location.origin);
  
  // Check if we're currently impersonating
  const currentParams = new URLSearchParams(window.location.search);
  const impersonateParam = currentParams.get('impersonate');
  
  if (impersonateParam) {
    url.searchParams.set('impersonate', impersonateParam);
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