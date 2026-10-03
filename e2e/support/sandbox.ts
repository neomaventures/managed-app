import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync } from "fs"
import { join, resolve } from "path"

const HARNESS_SRC = resolve(__dirname, "..", "..", "src")
const TMP_ROOT = resolve(__dirname, "..", ".tmp")

export interface Sandbox {
  dir: string
  cleanup: () => void
}

/**
 * Creates an isolated, disposable copy of the harness `src/` under a gitignored
 * `e2e/.tmp` directory and `chdir`s into it. This lets the engine resolve its
 * cwd-relative module paths against throwaway files instead of mutating the real
 * `src/`. Call `cleanup()` (in `afterEach`) to restore cwd and remove the dir.
 */
export const createSandbox = (): Sandbox => {
  mkdirSync(TMP_ROOT, { recursive: true })
  const dir = mkdtempSync(join(TMP_ROOT, "app-"))
  cpSync(HARNESS_SRC, join(dir, "src"), { recursive: true })

  const originalCwd = process.cwd()
  process.chdir(dir)

  return {
    dir,
    cleanup: (): void => {
      process.chdir(originalCwd)
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

/**
 * Copies one of the `bak.*` templates to the default application-module
 * location (`src/application/application.module.ts`) inside the sandbox.
 */
export const placeDefaultModule = (
  sandbox: Sandbox,
  template: string,
): void => {
  copyFileSync(
    join(sandbox.dir, "src", "application", template),
    join(sandbox.dir, "src", "application", "application.module.ts"),
  )
}
