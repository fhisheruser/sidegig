import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ProfileStore } from "./profile.js";
import { audienceProfileSchema } from "./profile.js";
import { buildSearchQuery, type BraveSearch } from "./search.js";

export function createConetServer(profileStore: ProfileStore, search: BraveSearch): McpServer {
  const server = new McpServer({
    name: "conet",
    version: "0.1.0"
  });

  server.registerTool(
    "set_audience",
    {
      title: "Set my audience",
      description: "Choose whether Conet should find potential customers or marketing hires, then save the business and audience details. Use this again any time the startup's needs change.",
      inputSchema: {
        goal: audienceProfileSchema.shape.goal,
        business: audienceProfileSchema.shape.business,
        industry: audienceProfileSchema.shape.industry,
        audience: audienceProfileSchema.shape.audience,
        geography: audienceProfileSchema.shape.geography,
        offer: audienceProfileSchema.shape.offer
      }
    },
    async (input) => {
      const profile = audienceProfileSchema.parse(input);
      await profileStore.set(profile);
      return textResult(`Audience saved. Conet will look for ${profile.audience} to ${profile.goal === "find_customers" ? "reach as potential customers" : "consider for marketing roles"} in ${profile.industry}${profile.geography ? `, in ${profile.geography}` : ""}. You can change these preferences at any time.`);
    }
  );

  server.registerTool(
    "get_audience",
    {
      title: "View my audience",
      description: "Show the current business, industry, audience, goal, and geography saved in Conet."
    },
    async () => {
      const profile = await profileStore.get();
      return textResult(profile ? JSON.stringify(profile, null, 2) : "No audience is set yet. Use set_audience to choose customers or marketing hires.");
    }
  );

  server.registerTool(
    "find_prospects",
    {
      title: "Find prospects",
      description: "Search public web pages for people or organizations matching the saved audience. Results are links and public snippets from Brave Search, not verified leads. Conet does not scrape social networks, collect email addresses, or send messages. Ask before searching if no audience has been saved.",
      inputSchema: {
        query: z.string().trim().min(1).max(200).optional().describe("Optional search phrase to narrow or replace the audience-based search."),
        geography: z.string().trim().min(1).max(120).optional().describe("Optional location, such as a country, region, or 'anywhere'."),
        count: z.number().int().min(1).max(10).default(5).describe("Maximum number of public search results to return (1-10).")
      }
    },
    async ({ query, geography, count }) => {
      const profile = await profileStore.get();
      if (!profile) {
        return textResult("Set an audience first with set_audience. Choose customers or marketing hires, then specify the industry, target audience, and optional geography.");
      }

      const searchQuery = buildSearchQuery(profile, query, geography);
      const results = await search.search(searchQuery, count);
      if (results.length === 0) {
        return textResult(`No public web results were found for: ${searchQuery}`);
      }

      const formatted = results.map((result, index) =>
        `${index + 1}. ${result.title}\n${result.url}\n${result.description}`
      ).join("\n\n");
      return textResult(`Public web results for "${searchQuery}" (verify fit and contact details at the source):\n\n${formatted}`);
    }
  );

  server.registerTool(
    "draft_intro",
    {
      title: "Draft an introduction",
      description: "Create one short, personalized message for a prospect that the user has already selected. This only drafts text; it never sends email, LinkedIn messages, or campaigns.",
      inputSchema: {
        recipient: z.string().trim().min(1).max(120).describe("The person's name or organization, as shown on a public page."),
        context: z.string().trim().min(1).max(400).describe("A relevant detail the user verified from the prospect's public page."),
        callToAction: z.string().trim().min(1).max(160).describe("A low-pressure next step, such as a short introductory call.")
      }
    },
    async ({ recipient, context, callToAction }) => {
      const profile = await profileStore.get();
      if (!profile) {
        return textResult("Set an audience first with set_audience so the draft reflects the startup's purpose.");
      }

      const purpose = profile.goal === "find_customers"
        ? `I'm reaching out because we help ${profile.industry} ${profile.audience}${profile.offer ? ` with ${profile.offer}` : ""}.`
        : `I'm building a ${profile.industry} startup and looking for someone with experience in ${profile.audience}.`;
      const body = [
        `Hi ${recipient},`,
        "",
        `I noticed ${context}.`,
        purpose,
        "",
        `${callToAction} If it's not relevant, no worries.`,
        "",
        "Best,"
      ].join("\n");
      return textResult(`Draft only — review and personalize before sending:\n\n${body}`);
    }
  );

  return server;
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}
