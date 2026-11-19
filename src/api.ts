export type Project = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  status: "draft" | "planning" | "prototype" | "archived";
  scene_json: string;
  created_at: string;
  updated_at: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data as T;
}

export const projectApi = {
  health: () => request<{ ok: boolean; service: string; database: string }>("/api/health"),
  list: async () => (await request<{ projects: Project[] }>("/api/projects")).projects,
  create: async (input: { name: string; description?: string; prompt?: string; scene_json?: string }) =>
    (await request<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(input) })).project,
  update: async (id: string, input: { name?: string; description?: string; prompt?: string; status?: Project["status"]; scene_json?: string }) =>
    (await request<{ project: Project }>(`/api/projects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })).project,
  remove: (id: string) => request<{ deleted: boolean }>(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export type NpcProfile={id:string;name:string;role:string;dialogue:string;x:number;z:number;radius:number;personality:string;routine:string;greeting:string;appearance_json:string;preview_url?:string|null;model_url?:string|null};
export type NpcCatalogueResponse={npcs:NpcProfile[];total:number;limit:number;offset:number;nextOffset:number|null;source:string};
export const npcApi={list:async(limit=24,offset=0,query="",category="All",mode:"search"|"describe"="search"):Promise<NpcCatalogueResponse>=>{const params=new URLSearchParams({limit:String(limit),offset:String(offset)});if(query.trim())params.set("q",query.trim());if(category!=="All")params.set("category",category);if(mode==="describe")params.set("mode","describe");const response=await fetch("/api/npcs?"+params.toString());const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error??"NPC catalogue request failed ("+response.status+")");return data as NpcCatalogueResponse;}};
