---
name: Orval hook query options with TanStack Query v5
description: Passing enabled:false to Orval-generated query hooks requires queryKey too, or TypeScript errors
---

In TanStack Query v5, `UseQueryOptions` requires `queryKey` to be present. Orval generates hooks that accept `{ query?: UseQueryOptions<...> }`. Passing just `{ enabled: false }` causes TS2741 "queryKey is missing".

**Why:** TanStack Query v5 made `queryKey` a required property of `UseQueryOptions`. Orval's generated types expose this constraint to callers.

**How to apply:** When passing conditional `enabled` to an Orval-generated hook, also pass the corresponding `getXxxQueryKey(id)`:
```ts
useGetTemplate(id ?? 0, {
  query: { enabled: isEdit && !!id, queryKey: getGetTemplateQueryKey(id ?? 0) },
});
```
The hook ignores the user-provided queryKey internally anyway (it calls its own query options builder), but TypeScript requires it.
