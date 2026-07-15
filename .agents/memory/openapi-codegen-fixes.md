---
name: OpenAPI codegen fixes for Orval + Zod v3
description: Patterns that cause Orval 8.21 to fail with Zod v3, and how to avoid them
---

# OpenAPI Codegen Fixes (Orval 8.21 + Zod v3)

## looseObject error
`type: object` without `properties` → Orval generates `zod.looseObject({})` which is Zod v4 only.

**Fix:** Always define at least one `properties` field on any `type: object` schema. Use a concrete named schema (`$ref`) instead of inline bare objects.

## Multipart upload collision
An inline `multipart/form-data` requestBody with a `file: {type: string, format: binary}` field causes:
1. `zod.instanceof(File)` / `Blob` not found in Node context
2. Orval auto-names the body `<OperationId>Body` colliding with the types output

**Fix:** Do NOT put multipart upload endpoints in the OpenAPI spec. Handle them directly in Express routes with Multer. The generated hooks are not needed for binary upload; use native `fetch()` from the frontend.

**Why:** These are known Zod v3 / Orval compatibility issues. The catalog pins `zod@3.25.76`.
