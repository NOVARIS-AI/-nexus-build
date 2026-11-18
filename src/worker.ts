interface D1Result<T = Record<string, unknown>> { results?: T[]; success: boolean; meta?: { changes?: number }; }
interface D1Statement { bind(...values: unknown[]): D1Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; run(): Promise<D1Result>; }
interface D1Database { prepare(query: string): D1Statement; }
interface Env { DB: D1Database; ASSETS: { fetch(request: Request): Promise<Response> }; }

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const now = () => new Date().toISOString();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "nexus-build-api", database: "bound", timestamp: now() });
    }
    if (url.pathname === "/api/projects" && request.method === "GET") {
      const result = await env.DB.prepare("SELECT id, name, description, prompt, status, created_at, updated_at FROM projects ORDER BY updated_at DESC").all();
      return json({ projects: result.results ?? [] });
    }
    if (url.pathname === "/api/projects" && request.method === "POST") {
      let body: { name?: string; description?: string; prompt?: string };
      try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
      const name = body.name?.trim();
      if (!name) return json({ error: "Project name is required." }, 400);
      const id = crypto.randomUUID();
      const timestamp = now();
      await env.DB.prepare("INSERT INTO projects (id, name, description, prompt, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?)")
        .bind(id, name, body.description?.trim() ?? "", body.prompt?.trim() ?? "", timestamp, timestamp).run();
      return json({ project: { id, name, description: body.description?.trim() ?? "", prompt: body.prompt?.trim() ?? "", status: "draft", created_at: timestamp, updated_at: timestamp } }, 201);
    }
    const match = url.pathname.match(/^\/api\/projects\/([a-f0-9-]+)$/i);
    if (match && request.method === "GET") {
      const project = await env.DB.prepare("SELECT id, name, description, prompt, status, created_at, updated_at FROM projects WHERE id = ?").bind(match[1]).first();
      return project ? json({ project }) : json({ error: "Project not found." }, 404);
    }
    if (match && request.method === "PATCH") {
      let body: { name?: string; description?: string; prompt?: string; status?: string };
      try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
      const existing = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(match[1]).first();
      if (!existing) return json({ error: "Project not found." }, 404);
      const allowed = ["draft", "planning", "prototype", "archived"];
      if (body.status && !allowed.includes(body.status)) return json({ error: "Invalid project status." }, 400);
      await env.DB.prepare("UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), prompt = COALESCE(?, prompt), status = COALESCE(?, status), updated_at = ? WHERE id = ?")
        .bind(body.name?.trim() || null, body.description ?? null, body.prompt ?? null, body.status ?? null, now(), match[1]).run();
      const project = await env.DB.prepare("SELECT id, name, description, prompt, status, created_at, updated_at FROM projects WHERE id = ?").bind(match[1]).first();
      return json({ project });
    }
    if (match && request.method === "DELETE") {
      const result = await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(match[1]).run();
      if (!result.meta?.changes) return json({ error: "Project not found." }, 404);
      return json({ deleted: true, id: match[1] });
    }
    return json({ error: "API route not found." }, 404);
  }
};
