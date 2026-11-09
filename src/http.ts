import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ProfileStore } from "./profile.js";
import type { BraveSearch } from "./search.js";
import { createConetServer } from "./server.js";

export interface HttpServerOptions {
  host: string;
  port: number;
  apiKey: string;
}

export function startHttpServer(profileStore: ProfileStore, search: BraveSearch, options: HttpServerOptions): Promise<Server> {
  if (options.apiKey.length < 32) {
    throw new Error("SIDGIG_API_KEY must be at least 32 characters before starting HTTP mode.");
  }

  const httpServer = createServer(async (request, response) => {
    if (request.url === "/health" && request.method === "GET") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", service: "conet" }));
      return;
    }

    if (request.url?.split("?")[0] !== "/mcp") {
      response.writeHead(404).end("Not found");
      return;
    }

    if (!isAuthorized(request, options.apiKey)) {
      response.writeHead(401, { "www-authenticate": "Bearer" }).end("Unauthorized");
      return;
    }

    const mcpServer = createConetServer(profileStore, search);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(request, response, await readJsonBody(request));
    } catch (error) {
      if (!response.headersSent) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: error instanceof Error ? error.message : "Invalid MCP request"
          },
          id: null
        }));
      } else {
        response.destroy(error instanceof Error ? error : undefined);
      }
    } finally {
      await transport.close();
      await mcpServer.close();
    }
  });

  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(options.port, options.host, () => {
      httpServer.off("error", reject);
      const address = httpServer.address();
      const port = typeof address === "object" && address ? address.port : options.port;
      console.error(`Conet MCP HTTP server listening at http://${options.host}:${port}/mcp`);
      resolve(httpServer);
    });
  });
}

function isAuthorized(request: IncomingMessage, expected: string): boolean {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const received = Buffer.from(header.slice("Bearer ".length));
  const expectedBuffer = Buffer.from(expected);
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.method !== "POST") {
    return undefined;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1024 * 1024) {
      throw new Error("MCP request body exceeds the 1 MB limit.");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
