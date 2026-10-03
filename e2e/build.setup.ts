import { execSync } from "child_process"
import { resolve } from "path"

// Rebuild the lib before the e2e modules are imported.
//
// The e2e specs resolve `@neomaventures/managed-app` to `dist/` (see jest-e2e.json), so
// the compiled output must be current. This runs as a `setupFiles` entry: once
// per test file, *before* the test's top-level imports resolve, and again on
// every `--watch` save (unlike `pretest`/`globalSetup`, which fire once per jest
// process). `tsc --incremental` keeps it sub-second when nothing changed.
execSync("pnpm build", { cwd: resolve(__dirname, ".."), stdio: "inherit" })
