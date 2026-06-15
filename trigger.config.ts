import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_ntzmvffvnnovgxboqlfp",
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 1,
    },
  },
  dirs: ["./trigger"],
});
