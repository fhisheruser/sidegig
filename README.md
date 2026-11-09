# Sidegig

Sidegig is a small Claude connector for startup owners. Set the kind of people you need, find public web pages that may be relevant, and draft one-to-one introductions for review. Switch the saved audience whenever your priority changes—for example, from healthcare customers to healthcare marketing hires.

There is no separate dashboard in this first version; Claude is the interface, with a short set of tools and plain-language prompts.

## What it does

- Saves one audience profile locally: customers **or** marketing hires, industry, target audience, geography, and offer.
- Searches public web results through Brave Search and returns source links and snippets.
- Drafts individual introductions for you to review; it never sends messages or campaigns.
- Runs as a local MCP server for Claude Desktop, or as an authenticated HTTP MCP server that can be deployed for Claude's remote connectors.

This first version does not directly integrate with LinkedIn, other social platforms, or email services. Sidegig does not log in to or scrape social networks, verify that a result is a good lead, or collect email addresses. Search results are leads to review, not endorsements. Use contact details only when you have a lawful basis to do so and follow applicable privacy and marketing rules.

## Requirements

- Node.js 20+
- A [Brave Search API key](https://brave.com/search/api/) for prospect search

## Install

```sh
npm install
npm run build
```

Create a `.env` file based on `.env.example` and add `BRAVE_SEARCH_API_KEY`. Keep `.env` private; it is ignored by git.

## Connect to Claude Desktop (local)

Build the project, then add a server entry to Claude Desktop's `claude_desktop_config.json`. Replace the paths with the actual absolute paths on your computer:

```json
{
  "mcpServers": {
    "sidegig": {
      "command": "node",
      "args": ["C:\\path\\to\\sidegig\\dist\\index.js", "--stdio"],
      "env": {
        "BRAVE_SEARCH_API_KEY": "your-brave-search-api-key"
      }
    }
  }
}
```

Restart Claude Desktop after editing the config. Local profile data is stored in `~/.sidegig/audience-profile.json` (on Windows, the home directory is your user profile). Set `SIDGIG_PROFILE_PATH` to choose another location.

## Connect as a remote Claude connector

Run the HTTP transport behind a publicly reachable HTTPS reverse proxy or deploy it to a hosting service:

```sh
# Set BRAVE_SEARCH_API_KEY, SIDGIG_API_KEY, HOST=0.0.0.0, and PORT in your hosting environment.
npm run start:http
```

`SIDGIG_API_KEY` must be a unique secret of at least 32 characters. The endpoint is `/mcp`; `/health` is a basic health check. Configure the remote connector in Claude with the HTTPS `/mcp` URL and the matching bearer/API-key credential. Do not expose the HTTP service without TLS and authentication. The remote version uses a single local profile file, so it is intended for a trusted single-user deployment—not a shared multi-tenant service.

Claude Desktop can also connect to this remote endpoint as a custom connector. That differs from its local stdio setup above: Claude's cloud connects to the remote URL, which must be reachable over the public internet.

## Use it

In Claude, ask Sidegig to:

1. Use `set_audience` with `goal` set to `find_customers` or `hire_marketers`, and fill in the business, industry, audience, and optional geography/offer.
2. Use `find_prospects` to get public web results. You can change the location or provide a narrower search phrase.
3. Use `draft_intro` for one prospect you have already reviewed. The returned message is a draft only.
4. Call `set_audience` again to change priorities, or `get_audience` to check the current profile.

## Development

```sh
npm run website
npm run dev
npm test
npm run build
```

`npm run website` starts the product website at `http://127.0.0.1:4173`. To use another port, set `WEBSITE_PORT` before starting it.
