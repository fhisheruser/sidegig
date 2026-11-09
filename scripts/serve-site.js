import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../website", import.meta.url)));
const files = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"]
]);
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"]
]);
const server = createServer(async (request, response) => {
  const file = files.get(new URL(request.url ?? "/", "http://localhost").pathname);
  if (!file || request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }

  const path = resolve(root, file);
  if (!path.startsWith(`${root}${sep}`)) {
    response.writeHead(404).end("Not found");
    return;
  }

  try {
    const body = await readFile(path);
    response.writeHead(200, {
      "content-type": contentTypes.get(extname(path)) ?? "application/octet-stream",
      "content-length": body.byteLength,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    console.error(`Could not serve ${path}:`, error);
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end("Could not load the website");
  }
});

const port = Number(process.env.WEBSITE_PORT ?? "4173");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("WEBSITE_PORT must be a whole number between 1 and 65535.");
}

server.listen(port, "127.0.0.1", () => {
  console.log(`Conet website running at http://127.0.0.1:${port}`);
});
