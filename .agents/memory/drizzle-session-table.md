---
name: Drizzle session table exclusion
description: Why tablesFilter is required in drizzle.config.ts and which import path to use for db in API routes
---

## Rule
`lib/db/drizzle.config.ts` must include `tablesFilter: ["!session"]` to prevent drizzle-kit from interactively prompting about the `session` table managed by `connect-pg-simple`.

**Why:** The session table is created by `connect-pg-simple` via raw SQL at startup — it is not in the Drizzle schema. Without the filter, `drizzle-kit push` detects it as an unknown table and halts with a data-loss prompt (stdin is closed in post-merge setup, so the script times out).

**How to apply:** Always keep this filter in `drizzle.config.ts`. Never remove it. Any new tables added to the schema should be managed through Drizzle only.

## API routes DB import
All API server routes must import `db` and schema tables from `@workspace/db`, not from a relative path:

```ts
import { db, messagesTable } from "@workspace/db";
```

**Why:** The relative path `../lib/db` does not resolve correctly through esbuild's bundle step. Using the workspace package alias always works.

## api-client-react index.ts
The `lib/api-client-react/src/index.ts` file must not have duplicate export lines. Orval codegen can append duplicate `export *` lines after regeneration — if the build shows "does not provide an export named X", check for duplicates in this file.
