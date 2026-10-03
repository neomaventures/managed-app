import { managedAppInstance } from "@neomaventures/managed-app"
import { type App } from "supertest/types"

const LOCATION = "src/path-alias/path-alias.module.ts"
const MODULE = "PathAliasModule"
const PARAMETER = `${LOCATION}#${MODULE}`

describe(LOCATION, () => {
  describe(`Given there is a module at ${LOCATION} that has an unresolvable import`, () => {
    describe(`When it's called with ${PARAMETER}`, () => {
      it("should report that the module was found but failed to import", async () => {
        return expect(managedAppInstance<App>(PARAMETER)).rejects.toThrow(
          `${LOCATION} module found but an error occured whilst importing.`,
        )
      })
    })
  })
})
