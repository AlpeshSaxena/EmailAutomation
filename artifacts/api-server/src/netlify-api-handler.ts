import serverless from "serverless-http";
import app from "./app.js";

const wrapped = serverless(app);

/**
 * Netlify Function handler — wraps the Express app with serverless-http.
 *
 * Netlify forwards the FULL original request path (including /api) when
 * redirecting with `to = "/.netlify/functions/api"` (no :splat).
 * We guard against missing prefix just in case.
 */
export const handler = async (event: Record<string, unknown>, context: unknown) => {
  const originalPath = (event["path"] as string) || "/";

  // Ensure /api prefix is present so Express routing works
  const fixedPath = originalPath.startsWith("/api")
    ? originalPath
    : `/api${originalPath.startsWith("/") ? originalPath : `/${originalPath}`}`;

  const fixedEvent = { ...event, path: fixedPath };

  return (wrapped as (e: unknown, c: unknown) => Promise<unknown>)(fixedEvent, context);
};
