"use client";

import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import superjson from "superjson";

// Import the AppRouter type from the API package for end-to-end type safety.
// This is a type-only import so it has no runtime cost.
import type { AppRouter } from "../../../api/src/router/index";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
}
