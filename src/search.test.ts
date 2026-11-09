import assert from "node:assert/strict";
import { test } from "node:test";
import { BraveSearch, buildSearchQuery } from "./search.js";
import type { AudienceProfile } from "./profile.js";

const customerProfile: AudienceProfile = {
  goal: "find_customers",
  business: "CareFlow",
  industry: "healthcare",
  audience: "doctors",
  geography: "Canada",
  offer: "appointment scheduling"
};

test("builds a customer query from the saved audience", () => {
  assert.equal(
    buildSearchQuery(customerProfile),
    "doctors healthcare potential customer appointment scheduling Canada"
  );
});

test("uses a supplied search phrase and location without mutating profile preferences", () => {
  assert.equal(
    buildSearchQuery(customerProfile, "family doctors", "United States"),
    "family doctors United States"
  );
});

test("uses the marketing-hiring intent in a search query", () => {
  assert.equal(
    buildSearchQuery({ ...customerProfile, goal: "hire_marketers" }),
    "doctors healthcare marketing professional Canada"
  );
});

test("does not narrow a worldwide search with a global location word", () => {
  assert.equal(
    buildSearchQuery({ ...customerProfile, geography: "Everywhere" }),
    "doctors healthcare potential customer appointment scheduling"
  );
});

test("sends a bounded public search request and omits email addresses from snippets", async () => {
  let requestUrl: URL | undefined;
  const search = new BraveSearch("test-key", async (input, init) => {
    requestUrl = new URL(input.toString());
    assert.equal(new Headers(init?.headers).get("X-Subscription-Token"), "test-key");
    return Response.json({
      web: {
        results: [
          { title: "Doctor directory", url: "https://example.com/doctors", description: "Contact doctor@example.com for details." },
          { title: "Unsafe URL", url: "javascript:alert(1)", description: "Not a web page." }
        ]
      }
    });
  });

  const results = await search.search("doctors healthcare", 5);
  assert.equal(requestUrl?.searchParams.get("q"), "doctors healthcare");
  assert.equal(requestUrl?.searchParams.get("count"), "5");
  assert.deepEqual(results, [{
    title: "Doctor directory",
    url: "https://example.com/doctors",
    description: "Contact [email omitted] for details."
  }]);
});

test("fails explicitly when the Brave Search key is missing", async () => {
  const search = new BraveSearch(undefined);
  await assert.rejects(search.search("doctors", 5), /BRAVE_SEARCH_API_KEY is missing/);
});
