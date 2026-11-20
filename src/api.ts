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
  health: () => request<{ ok: boolean; service: string; database: string; databaseReady: boolean; aiAvailable: boolean; staticAssetsBound: boolean }>("/api/health"),
  list: async () => (await request<{ projects: Project[] }>("/api/projects")).projects,
  create: async (input: { name: string; description?: string; prompt?: string; scene_json?: string }) =>
    (await request<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(input) })).project,
  update: async (id: string, input: { name?: string; description?: string; prompt?: string; status?: Project["status"]; scene_json?: string }) =>
    (await request<{ project: Project }>(`/api/projects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })).project,
  remove: (id: string) => request<{ deleted: boolean }>(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export type NpcProfile={id:string;name:string;role:string;dialogue:string;x:number;z:number;radius:number;personality:string;routine:string;greeting:string;appearance_json:string;preview_url?:string|null;model_url?:string|null};
export type NpcCatalogueResponse={npcs:NpcProfile[];total:number;limit:number;offset:number;nextOffset:number|null;source:string};
export type GeneratedNpcResponse={npc:NpcProfile;source:string;saved:boolean};
export const npcApi={
 list:async(limit=24,offset=0,query="",category="All",mode:"search"|"describe"="search"):Promise<NpcCatalogueResponse>=>{const params=new URLSearchParams({limit:String(limit),offset:String(offset)});if(query.trim())params.set("q",query.trim());if(category!=="All")params.set("category",category);if(mode==="describe")params.set("mode","describe");const response=await fetch("/api/npcs?"+params.toString());const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error??"NPC catalogue request failed ("+response.status+")");return data as NpcCatalogueResponse;},
 generate:async(description:string,category="All"):Promise<GeneratedNpcResponse>=>request<GeneratedNpcResponse>("/api/npcs/generate",{method:"POST",body:JSON.stringify({description,category})}),
 saveCharacter:async(id:string,config:Record<string,unknown>)=>request<{saved:boolean;id:string}>("/api/npcs/"+encodeURIComponent(id)+"/character",{method:"PUT",body:JSON.stringify({config})})
};


export type BlueprintRevision={id:string;taskId:string;title:string;blueprint:import("./lib/nexusCore").GameBlueprint;createdAt:string};
export const directorApi={
 listRevisions:async(limit=20)=> (await request<{revisions:BlueprintRevision[]}>(`/api/director/revisions?limit=${limit}`)).revisions,
 saveRevision:async(blueprint:import("./lib/nexusCore").GameBlueprint,taskId="")=> (await request<{revision:BlueprintRevision}>("/api/director/revisions",{method:"POST",body:JSON.stringify({blueprint,taskId})})).revision
};

export type AssetCatalogueRecord={id:string;name:string;asset_type:string;prompt:string;prompt_key:string;mime_type:string;size_bytes:number;source:string;model:string;license:string;tags_json:string;storage_backend?:string|null;created_at:string;updated_at:string};
export type GeneratedImageAsset={imageDataUrl:string;mimeType:string;model:string;taskId:string;assetType:string;source:string};
export const assetApi={
 list:async(limit=24,offset=0,query="",type="")=>{
  const params=new URLSearchParams({limit:String(limit),offset:String(offset)});
  if(query.trim())params.set("q",query.trim());
  if(type)params.set("type",type);
  return request<{assets:AssetCatalogueRecord[];total:number;limit:number;offset:number;nextOffset:number|null;source:string}>("/api/assets?"+params.toString());
 },
 generateModel:(prompt:string)=>request<{blueprint:{name:string;description:string;parts:{shape:"box"|"sphere"|"cylinder"|"cone"|"torus";position:[number,number,number];scale:[number,number,number];rotation?:[number,number,number];color:string}[]};taskId:string;source:string}>("/api/assets/generate-3d",{method:"POST",body:JSON.stringify({prompt})}),
 generateImage:(prompt:string,assetType:"Texture"|"Concept art"|"Sprite"="Texture")=>
  request<GeneratedImageAsset>("/api/assets/generate",{method:"POST",body:JSON.stringify({prompt,assetType})}),
 register:(asset:{id:string;name:string;assetType:string;prompt?:string;promptKey?:string;mimeType:string;sizeBytes:number;source:"imported"|"workers-ai";model?:string;license?:string;tags?:string[]})=>
  request<{saved:boolean;id:string;source:string}>("/api/assets/register",{method:"POST",body:JSON.stringify(asset)}),
 upload:async(id:string,file:File)=>{const form=new FormData();form.set("id",id);form.set("file",file);const response=await fetch("/api/assets/upload",{method:"POST",body:form});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error??`Upload failed (${response.status})`);return data as {uploaded:boolean;id:string;storage:string;sizeBytes:number};},
 versions:(id:string)=>request<{versions:{version_id:number;name:string;asset_type:string;mime_type:string;size_bytes:number;source:string;model:string;license:string;created_at:string}[];source:string}>("/api/assets/"+encodeURIComponent(id)+"/versions"),
 removeCloudFile:(id:string)=>request<{deleted:boolean;id:string}>("/api/assets/file/"+encodeURIComponent(id),{method:"DELETE"}),
 fileUrl:(id:string)=>"/api/assets/file/"+encodeURIComponent(id)
};
