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

const projects = await readJson("/api/projects");
if (!projects.response.ok || !Array.isArray(projects.body?.projects)) {
  throw new Error(`Project listing failed (${projects.response.status}): ${JSON.stringify(projects.body)}`);
}

const invalidProject = await readJson("/api/projects", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "   " }),
});
if (invalidProject.response.status !== 400 || typeof invalidProject.body?.error !== "string") {
  throw new Error(`Invalid project input was not rejected safely (${invalidProject.response.status}): ${JSON.stringify(invalidProject.body)}`);
}

console.log("API smoke tests passed: health, D1 readiness, project listing and input validation.");
