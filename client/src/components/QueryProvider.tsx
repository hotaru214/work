import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { reportError } from "../utils/error-reporting";

function shouldReportQueryError(error: any) {
  if (error?.name === "AbortError") return false;
  if (error?.status === 401 || error?.status === 403 || error?.status === 404) return false;
  return true;
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (!shouldReportQueryError(error)) return;
        reportError(error, "tanstack.query", {
          queryKey: query.queryKey,
          queryHash: query.queryHash,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, _context, mutation) => {
        if (!shouldReportQueryError(error)) return;
        reportError(error, "tanstack.mutation", {
          mutationKey: mutation.options.mutationKey,
          variables,
        });
      },
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error: any) => {
          if (error?.status === 401 || error?.status === 403 || error?.status === 404) return false;
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
