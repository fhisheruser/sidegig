import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { AudienceProfile, ProfileStore } from "./profile.js";
import { BraveSearch } from "./search.js";
import { startHttpServer } from "./http.js";

test("authenticated HTTP transport supports MCP initialization and tool calls", async () => {
  let profile: AudienceProfile | null = null;
  const profileStore: ProfileStore = {
    async get() {
      return profile;
    },
    async set(value) {
      profile = value;
    }
  };
  const apiKey = "test-api-key-that-is-at-least-32-characters";
  const server = await startHttpServer(profileStore, new BraveSearch("test-key"), {
    host: "127.0.0.1",
    port: 0,
    apiKey
  });
  const address = server.address() as AddressInfo;
  const endpoint = `http://127.0.0.1:${address.port}/mcp`;
  const client = new Client({ name: "conet-test", version: "0.1.0" });

  try {
    const unauthorized = await fetch(endpoint);
    assert.equal(unauthorized.status, 401);

    await client.connect(new StreamableHTTPClientTransport(
      new URL(endpoint),
      { requestInit: { headers: { Authorization: `Bearer ${apiKey}` } } }
    ));

    const listedTools = await client.listTools();
    assert.deepEqual(
      listedTools.tools.map((tool) => tool.name).sort(),
      ["draft_intro", "find_prospects", "get_audience", "set_audience"]
    );

    const saved = await client.callTool({
      name: "set_audience",
      arguments: {
        goal: "find_customers",
        business: "CareFlow",
        industry: "healthcare",
        audience: "doctors",
        geography: "Canada",
        offer: "appointment scheduling"
      }
    });
    assert.match(JSON.stringify(saved), /Audience saved/);

    const current = await client.callTool({ name: "get_audience", arguments: {} });
    assert.match(JSON.stringify(current), /CareFlow/);
  } finally {
    await client.close();
    server.close();
    await once(server, "close");
  }
});

test("stdio transport supports the same MCP tools", async () => {
  const profilePath = join(tmpdir(), `conet-test-${randomUUID()}.json`);
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
  env.CONET_PROFILE_PATH = profilePath;
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "src/index.ts", "--stdio"],
    cwd: process.cwd(),
    env
  });
  const client = new Client({ name: "conet-stdio-test", version: "0.1.0" });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name).sort(),
      ["draft_intro", "find_prospects", "get_audience", "set_audience"]
    );
  } finally {
    await client.close();
  }
});
