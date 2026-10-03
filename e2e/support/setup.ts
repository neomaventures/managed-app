// Reset the module-path env var between tests so it cannot leak across specs.
afterEach((): void => {
  delete process.env.NEOMA_MANAGED_APP_MODULE_PATH
})
