import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `adminizer` is ESM and imports a directory internally (system/bindDocs → controllers/docs).
    // Node's ESM loader refuses that, so the package has to go through Vite's resolver instead of
    // being externalised — without this, importing anything from `adminizer` in a test (the docs
    // subsystem, for one) dies while collecting the file.
    server: { deps: { inline: ["adminizer"] } },
  },
});
