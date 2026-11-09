import type { AudienceProfile } from "./profile.js";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title?: unknown;
      url?: unknown;
      description?: unknown;
    }>;
  };
}

export function buildSearchQuery(profile: AudienceProfile, query?: string, geography?: string): string {
  const terms = query?.trim() || [
    profile.audience,
    profile.industry,
    profile.goal === "find_customers" ? "potential customer" : "marketing professional",
    profile.goal === "find_customers" ? profile.offer : undefined
  ].filter(Boolean).join(" ");
  const location = geography?.trim() || profile.geography;

  return [terms, location && !isGlobalLocation(location) ? location : undefined]
    .filter((term): term is string => Boolean(term))
    .join(" ");
}

export class BraveSearch {
  constructor(
    private readonly apiKey = process.env.BRAVE_SEARCH_API_KEY,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async search(query: string, count: number): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error("BRAVE_SEARCH_API_KEY is missing. Add your Brave Search API key to the environment and restart Sidegig.");
    }

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));

    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": this.apiKey
        },
        signal: AbortSignal.timeout(10_000)
      });
    } catch (error) {
      throw new Error(`Brave Search could not be reached: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!response.ok) {
      throw new Error(`Brave Search returned HTTP ${response.status}. Check the API key and search plan.`);
    }

    const payload = await response.json() as BraveSearchResponse;
    return (payload.web?.results ?? [])
      .filter((result): result is { title: string; url: string; description: string } =>
        typeof result.title === "string" &&
        typeof result.url === "string" &&
        typeof result.description === "string" &&
        isHttpUrl(result.url))
      .slice(0, count)
      .map((result) => ({
        title: result.title,
        url: result.url,
        description: result.description.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email omitted]")
      }));
  }
}

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isGlobalLocation(value: string): boolean {
  return /^(anywhere|everywhere|global|worldwide)$/i.test(value);
}
