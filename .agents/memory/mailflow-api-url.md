---
name: MailFlow API URL pattern
description: Orval-generated URL helpers already include the /api prefix from the OpenAPI servers[0].url; setting setBaseUrl causes double /api prefix
---

When the OpenAPI spec has `servers[0].url: /api`, Orval bakes `/api` into every generated URL helper (e.g. `/api/dashboard/stats`). Calling `setBaseUrl("/api")` in main.tsx prepends another `/api`, making requests hit `/api/api/dashboard/stats` — a 404.

**Why:** The custom-fetch `applyBaseUrl` function prepends the base URL to any path starting with `/`. Since the generated paths already start with `/api/...`, adding a base URL doubles the prefix.

**How to apply:** For web apps where the API is on the same origin, do NOT call `setBaseUrl` at all. Only call it in Expo/React Native apps that need to reach a remote server.
