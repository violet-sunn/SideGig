/**
 * Navigation utility that preserves impersonation parameters during development
 */
export function navigateTo(path: string, setLocation: (path: string) => void) {
  // In development mode, preserve the impersonate parameter
  if (import.meta.env.DEV) {
    const urlParams = new URLSearchParams(window.location.search);
    const impersonateId = urlParams.get('impersonate');
    
    if (impersonateId) {
      const separator = path.includes('?') ? '&' : '?';
      const newPath = `${path}${separator}impersonate=${impersonateId}`;
      setLocation(newPath);
      return;
    }
  }
  
  // Normal navigation
  setLocation(path);
}