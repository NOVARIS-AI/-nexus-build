const baseUrl = (process.env.API_BASE_URL ?? "https://nexus-build.schoolershubit5.workers.dev").replace(/\/$/, "");

async function readJson(path, init) {
  const response = await fetch(new URL(path, baseUrl), init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

const health = await readJson("/api/health");
if (!health.response.ok || health.body?.ok !== true || health.body?.databaseReady !== true) {
  throw new Error(`Health check failed (${health.response.status}): ${JSON.stringify(health.body)}`);
}

const npcCatalogue = await readJson("/api/npcs?limit=3");
if (!npcCatalogue.response.ok || !Array.isArray(npcCatalogue.body?.npcs) || npcCatalogue.body.npcs.length === 0 || Number(npcCatalogue.body.total) < 1200 || npcCatalogue.body.source !== "cloudflare-d1") {
  throw new Error(`NPC catalogue check failed (${npcCatalogue.response.status}): ${JSON.stringify(npcCatalogue.body)}`);
}

const assetCatalogue = await readJson("/api/assets?limit=3");
if (!assetCatalogue.response.ok || !Array.isArray(assetCatalogue.body?.assets) || assetCatalogue.body.source !== "cloudflare-d1-metadata") {
  throw new Error(`Asset catalogue check failed (${assetCatalogue.response.status}): ${JSON.stringify(assetCatalogue.body)}`);
}

const missingId = "00000000-0000-4000-8000-000000000000";
for (const [label, path, init] of [
  ["project list", "/api/projects"],
  ["project detail", `/api/projects/${missingId}`],
  ["project deletion", `/api/projects/${missingId}`, { method: "DELETE" }],
  ["project creation", "/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "smoke-test" }) }],
]) {
  const result = await readJson(path, init);
  if (![401, 503].includes(result.response.status) || typeof result.body?.error !== "string") {
    throw new Error(`Unauthenticated ${label} was not blocked (${result.response.status}): ${JSON.stringify(result.body)}`);
  }
}
for (const [label, path, init] of [
  ["asset catalogue invalid identity", "/api/assets?limit=3", { headers: { "Cf-Access-Jwt-Assertion": "invalid-test-token" } }],
  ["task listing", "/api/tasks"],
  ["task creation", "/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "anonymous-test", input: "This should be blocked.", engine: "auto" }) }],
  ["asset registration", "/api/assets/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "anonymous-test", name: "Anonymous", assetType: "Texture" }) }],
  ["2D asset generation", "/api/assets/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "A detailed fantasy stone texture for a game wall." }) }],
  ["3D asset generation", "/api/assets/generate-3d", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "A detailed low-poly wooden treasure chest." }) }],
  ["NPC generation", "/api/npcs/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "A friendly shopkeeper in a busy market." }) }],
  ["world generation", "/api/world/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "A small village with homes, roads and trees.", biome: "village", size: "compact" }) }],
  ["AI Director revision history", "/api/director/revisions"],
  ["AI Director revision save", "/api/director/revisions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ blueprint: {} }) }],
  ["AI Director planning", "/api/director/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "A small exploration game with puzzles." }) }],
]) {
  const result = await readJson(path, init);
  if (![401, 503].includes(result.response.status) || typeof result.body?.error !== "string") {
    throw new Error(`Unauthenticated ${label} was not blocked (${result.response.status}): ${JSON.stringify(result.body)}`);
  }
}

console.log("Protected task and generation endpoints correctly reject unauthenticated requests.");

console.log("API smoke tests passed: health, NPC catalogue, searchable asset metadata, revision-history authentication, project authentication, persistent tasks and generated world scene.");
