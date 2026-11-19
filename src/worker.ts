interface D1Result<T = Record<string, unknown>> { results?: T[]; success: boolean; meta?: { changes?: number }; }
interface D1Statement { bind(...values: unknown[]): D1Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; run(): Promise<D1Result>; }
interface D1Database { prepare(query: string): D1Statement; batch(statements: D1Statement[]): Promise<D1Result[]>; }
interface Env { DB: D1Database; ASSETS: { fetch(request: Request): Promise<Response> }; }

type NpcSeed = { id: string; name: string; role: string; dialogue: string; x: number; z: number; radius: number; personality: string; routine: string; greeting: string; appearance_json: string; created_at: string };
const NPC_COUNT = 1200;
const firstNames = ["Amina","Ayo","Bisi","Chika","Dami","Efe","Emeka","Faruq","Fola","Hadiza","Ife","Ikenna","Jide","Kelechi","Lara","Mariam","Nneka","Obinna","Ola","Olu","Onyeka","Sade","Tari","Tobi","Uche","Zainab","Ada","Boma","Chinwe","David","Ejiro","Farida","Gbenga","Hauwa","Ini","Jumoke","Kemi","Lekan","Moyo","Ngozi","Oghene","Rita","Seyi","Temi","Umar","Yemi","Zara","Abiola","Blessing","Chinedu","Daniel","Esther","Femi","Grace","Ibrahim","Joy","Kunle","Musa","Nana","Peter","Samuel","Tunde"];
const surnames = ["Adebayo","Adeyemi","Afolabi","Agu","Akande","Anyanwu","Balogun","Bello","Chukwu","Danjuma","Eze","Ezeani","Falana","Garba","Ibrahim","Idris","Iheanacho","Johnson","Kalu","Lawal","Musa","Nwosu","Obi","Okafor","Okeke","Okoro","Oladipo","Olawale","Osei","Sani","Soyinka","Udo","Usman","Yakubu","Yusuf","Abubakar","Akinyemi","Bakare","Duru","Etim","Iroko","Jatau","Kehinde","Mordi","Nwachukwu","Ojo","Oni","Salami"];
const roles = ["Shopkeeper","Teacher","Student","Nurse","Doctor","Mechanic","Bus driver","Food vendor","Tailor","Artist","Musician","Farmer","Security officer","Cleaner","Engineer","Photographer","Hair stylist","Barber","Electrician","Plumber","Delivery rider","Market trader","Chef","Builder","Librarian","Journalist","Designer","Gardener","Receptionist","Community volunteer"];
const personalities = ["warm","cheerful","shy","curious","energetic","calm","outgoing","thoughtful","serious","playful","helpful","reserved"];
const routines = ["market","school","clinic","transport","workshop","community","home","garden","creative","hospitality","office","street"];
const greetings = ["Good morning! How is your day going?","Welcome around here. Need any help?","Hello there. Lovely weather to be out.","Hi! I was just heading to my next stop.","Good to see you. Have you explored this area?","Hello! There is always something happening nearby."];
const dialogues = ["I have a busy day ahead, but I always make time to greet people in the neighbourhood.","Every day brings a new story around here. You just have to pay attention.","I know these streets quite well. There is usually a quicker route if you look around.","People make this place special. Everyone has somewhere to be and a story to tell.","I am taking a short break before getting back to work. What brings you around?","The neighbourhood changes throughout the day. Mornings and evenings feel completely different."];

function seeded(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
function makeNpcSeeds(): NpcSeed[] {
  const random = seeded(20261118);
  const created = new Date().toISOString();
  return Array.from({ length: NPC_COUNT }, (_, index) => ({
    id: "population-20261118-" + String(index + 1).padStart(4, "0"),
    name: firstNames[index % firstNames.length] + " " + surnames[Math.floor(index / firstNames.length) % surnames.length],
    role: roles[Math.floor(random() * roles.length)],
    dialogue: dialogues[Math.floor(random() * dialogues.length)],
    x: random() * 40 - 20,
    z: random() * 40 - 20,
    radius: 2.8,
    personality: personalities[Math.floor(random() * personalities.length)],
    routine: routines[Math.floor(random() * routines.length)],
    greeting: greetings[Math.floor(random() * greetings.length)],
    appearance_json: JSON.stringify({ version: 1, source: "ara-starter-preset", seed: "population-20261118-" + String(index + 1).padStart(4, "0") }),
    created_at: created
  }));
}
async function ensureNpcCatalogue(db: D1Database) {
  const row = await db.prepare("SELECT COUNT(*) AS total FROM npc_profiles").first<{ total: number }>();
  if ((row?.total ?? 0) >= NPC_COUNT) return;
  const seeds = makeNpcSeeds();
  for (let start = 0; start < seeds.length; start += 100) {
    const batch = seeds.slice(start, start + 100).map(npc => db.prepare(
      "INSERT OR IGNORE INTO npc_profiles (id,name,role,dialogue,x,z,radius,personality,routine,greeting,appearance_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(npc.id,npc.name,npc.role,npc.dialogue,npc.x,npc.z,npc.radius,npc.personality,npc.routine,npc.greeting,npc.appearance_json,npc.created_at));
    await db.batch(batch);
  }
}
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
    if (url.pathname === "/api/npcs" && request.method === "GET") {
      try {
        await ensureNpcCatalogue(env.DB);
        const requestedLimit = Number(url.searchParams.get("limit") ?? NPC_COUNT);
        const limit = Math.max(1, Math.min(NPC_COUNT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : NPC_COUNT));
        const offset = Math.max(0, Math.floor(Number(url.searchParams.get("offset") ?? 0) || 0));
        const term = (url.searchParams.get("q") ?? "").trim().toLowerCase();
        const like = "%" + term.replace(/[\\%_]/g, "\\$&") + "%";
        const where = term ? "WHERE lower(name) LIKE ? ESCAPE '\\\\' OR lower(role) LIKE ? ESCAPE '\\\\' OR lower(personality) LIKE ? ESCAPE '\\\\' OR lower(routine) LIKE ? ESCAPE '\\\\' OR lower(id) LIKE ? ESCAPE '\\\\'" : "";
        const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM npc_profiles " + where)
          .bind(...(term ? [like,like,like,like,like] : [])).first<{ total: number }>();
        const rows = await env.DB.prepare("SELECT id,name,role,dialogue,x,z,radius,personality,routine,greeting,appearance_json,preview_url,model_url FROM npc_profiles " + where + " ORDER BY id LIMIT ? OFFSET ?")
          .bind(...(term ? [like,like,like,like,like,limit,offset] : [limit,offset])).all();
        return json({ npcs: rows.results ?? [], total: count?.total ?? 0, limit, offset, nextOffset: offset + (rows.results?.length ?? 0) < (count?.total ?? 0) ? offset + (rows.results?.length ?? 0) : null, source: "cloudflare-d1" });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "NPC catalogue unavailable." }, 503);
      }
    }
    if (url.pathname === "/api/projects" && request.method === "GET") {
      const result = await env.DB.prepare("SELECT id, name, description, prompt, status, scene_json, created_at, updated_at FROM projects ORDER BY updated_at DESC").all();
      return json({ projects: result.results ?? [] });
    }
    if (url.pathname === "/api/projects" && request.method === "POST") {
      let body: { name?: string; description?: string; prompt?: string; scene_json?: string };
      try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
      const name = body.name?.trim();
      if (!name) return json({ error: "Project name is required." }, 400);
      const id = crypto.randomUUID();
      const timestamp = now();
      await env.DB.prepare("INSERT INTO projects (id, name, description, prompt, status, scene_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)")
        .bind(id, name, body.description?.trim() ?? "", body.prompt?.trim() ?? "", body.scene_json ?? "{}", timestamp, timestamp).run();
      return json({ project: { id, name, description: body.description?.trim() ?? "", prompt: body.prompt?.trim() ?? "", status: "draft", scene_json: body.scene_json ?? "{}", created_at: timestamp, updated_at: timestamp } }, 201);
    }
    const match = url.pathname.match(/^\\/api\\/projects\\/([a-f0-9-]+)$/i);
    if (match && request.method === "GET") {
      const project = await env.DB.prepare("SELECT id, name, description, prompt, status, scene_json, created_at, updated_at FROM projects WHERE id = ?").bind(match[1]).first();
      return project ? json({ project }) : json({ error: "Project not found." }, 404);
    }
    if (match && request.method === "PATCH") {
      let body: { name?: string; description?: string; prompt?: string; status?: string; scene_json?: string };
      try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
      const existing = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(match[1]).first();
      if (!existing) return json({ error: "Project not found." }, 404);
      const allowed = ["draft", "planning", "prototype", "archived"];
      if (body.status && !allowed.includes(body.status)) return json({ error: "Invalid project status." }, 400);
      await env.DB.prepare("UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), prompt = COALESCE(?, prompt), status = COALESCE(?, status), scene_json = COALESCE(?, scene_json), updated_at = ? WHERE id = ?")
        .bind(body.name?.trim() || null, body.description ?? null, body.prompt ?? null, body.status ?? null, body.scene_json ?? null, now(), match[1]).run();
      const project = await env.DB.prepare("SELECT id, name, description, prompt, status, scene_json, created_at, updated_at FROM projects WHERE id = ?").bind(match[1]).first();
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
