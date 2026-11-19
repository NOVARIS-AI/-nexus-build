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

const invalidAssetPrompt = await readJson("/api/assets/generate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ prompt: "tiny" }),
});
if (invalidAssetPrompt.response.status !== 400 || typeof invalidAssetPrompt.body?.error !== "string") {
  throw new Error(`Invalid asset prompt was not rejected safely (${invalidAssetPrompt.response.status}): ${JSON.stringify(invalidAssetPrompt.body)}`);
}

const projects = await readJson("/api/projects");
if (!projects.response.ok || !Array.isArray(projects.body?.projects)) {
  throw new Error(`Project listing failed (${projects.response.status}): ${JSON.stringify(projects.body)}`);
}

const missingId = "00000000-0000-4000-8000-000000000000";
const missingProject = await readJson(`/api/projects/${missingId}`);
if (missingProject.response.status !== 404 || typeof missingProject.body?.error !== "string") {
  throw new Error(`Missing project lookup did not return 404 (${missingProject.response.status}): ${JSON.stringify(missingProject.body)}`);
}

const missingDelete = await readJson(`/api/projects/${missingId}`, { method: "DELETE" });
if (missingDelete.response.status !== 404 || typeof missingDelete.body?.error !== "string") {
  throw new Error(`Missing project deletion did not return 404 (${missingDelete.response.status}): ${JSON.stringify(missingDelete.body)}`);
}

const invalidProject = await readJson("/api/projects", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "   " }),
});
if (invalidProject.response.status !== 400 || typeof invalidProject.body?.error !== "string") {
  throw new Error(`Invalid project input was not rejected safely (${invalidProject.response.status}): ${JSON.stringify(invalidProject.body)}`);
}

const taskCreate = await readJson("/api/tasks", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ type: "smoke-test", input: "Validate persistent generation task storage.", engine: "auto" }),
});
if (taskCreate.response.status !== 201 || taskCreate.body?.task?.status !== "queued" || !taskCreate.body?.task?.id) {
  throw new Error(`Generation task creation failed (${taskCreate.response.status}): ${JSON.stringify(taskCreate.body)}`);
}
const taskId = taskCreate.body.task.id;
const taskUpdate = await readJson(`/api/tasks/${taskId}`, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ status: "completed", result: { smokeTest: true } }),
});
if (!taskUpdate.response.ok || taskUpdate.body?.task?.status !== "completed") {
  throw new Error(`Generation task update failed (${taskUpdate.response.status}): ${JSON.stringify(taskUpdate.body)}`);
}
const taskList = await readJson("/api/tasks?limit=5");
if (!taskList.response.ok || !Array.isArray(taskList.body?.tasks) || !taskList.body.tasks.some((task) => task.id === taskId && task.result?.smokeTest === true)) {
  throw new Error(`Generation task listing failed (${taskList.response.status}): ${JSON.stringify(taskList.body)}`);
}

const worldGeneration = await readJson("/api/world/generate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ prompt: "A small coastal town with a central plaza, roads, homes and trees.", biome: "village", size: "compact" }),
});
if (!worldGeneration.response.ok || !worldGeneration.body?.validated || !Array.isArray(worldGeneration.body?.world?.objects) || worldGeneration.body.world.objects.length < 10 || !worldGeneration.body?.taskId) {
  throw new Error(`World generation failed (${worldGeneration.response.status}): ${JSON.stringify(worldGeneration.body)}`);
}

console.log("API smoke tests passed: health, NPC catalogue, asset catalogue, projects, persistent tasks and generated world scene.");
