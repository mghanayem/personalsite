#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
# Rebuild api-client-react declaration files so all packages (including mobile) typecheck correctly
cd lib/api-client-react && npx tsc -p tsconfig.json && cd ../..
