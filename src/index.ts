import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FileProfileStore } from "./profile.js";
import { BraveSearch } from "./search.js";
import { createConetServer } from "./server.js";
import { startHttpServer } from "./http.js";

async function main(): Promise<void> {
  const profileStore = new FileProfileStore();
  const search = new BraveSearch();
  const mode = process.argv[2] ?? "--stdio";

  if (mode === "--stdio") {
    const server = createConetServer(profileStore, search);
    await server.connect(new StdioServerTransport());
    return;
  }

  if (mode === "--http") {
    const apiKey = process.env.SIDGIG_API_KEY;
    if (!apiKey) {
      throw new Error("SIDGIG_API_KEY is required for HTTP mode. Set a unique secret of at least 32 characters.");
    }
    const host = process.env.HOST ?? "127.0.0.1";
    const port = Number(process.env.PORT ?? "3000");
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("PORT must be a whole number between 1 and 65535.");
    }

    await startHttpServer(profileStore, search, { host, port, apiKey });
    return;
  }

  throw new Error(`Unknown mode "${mode}". Use --stdio or --http.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
