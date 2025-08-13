import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: any = data ? { "Content-Type": "application/json" } : {};
  
  // Add impersonation header for development only
  if (import.meta.env.DEV) {
    const urlParams = new URLSearchParams(window.location.search);
    const impersonateId = urlParams.get('impersonate');
    if (impersonateId) {
      headers['x-impersonate'] = impersonateId;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [url, params] = queryKey as [string, any?];
    let finalUrl = url;
    const headers: any = {};
    
    // Handle impersonation parameter from query key (development only)
    if (import.meta.env.DEV && params?.impersonate) {
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set('impersonate', params.impersonate);
      finalUrl = urlObj.pathname + urlObj.search;
    }
    
    const res = await fetch(finalUrl, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
