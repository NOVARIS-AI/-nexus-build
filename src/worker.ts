import { verifyCloudflareAccess } from "./lib/accessAuth";
import { createFallbackBlueprint, chooseEngine, chooseProcessingMode, validateBlueprint, type EngineId, type GameBlueprint } from "./lib/nexusCore";
import { createFallbackWorld, sanitizeWorldObjects, validateWorldPlan, type WorldBiome } from "./lib/worldGeneration";
interface D1Result<T = Record<string, unknown>> { results?: T[]; success: boolean; meta?: { changes?: number }; }
interface D1Statement { bind(...values: unknown[]): D1Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; run(): Promise<D1Result>; }
interface D1Database { prepare(query: string): D1Statement; batch(statements: D1Statement[]): Promise<D1Result[]>; }
interface WorkersAI { run(model:string,input:Record<string,unknown>):Promise<{response?:string;image?:string}>; }
interface Env { DB: D1Database; AI: WorkersAI; ASSETS: { fetch(request: Request): Promise<Response> }; ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string; }
const firstNames=["Amina","Ayo","Bisi","Chika","Dami","Efe","Emeka","Faruq","Fola","Hadiza","Ife","Ikenna","Jide","Kelechi","Lara","Mariam","Nneka","Obinna","Ola","Olu","Onyeka","Sade","Tari","Tobi","Uche","Zainab","Ada","Boma","Chinwe","David","Ejiro","Farida","Gbenga","Hauwa","Ini","Jumoke","Kemi","Lekan","Moyo","Ngozi","Oghene","Rita","Seyi","Temi","Umar","Yemi","Zara","Abiola","Blessing","Chinedu","Daniel","Esther","Femi","Grace","Ibrahim","Joy","Kunle","Musa","Nana","Peter","Samuel","Tunde"];
const surnames=["Adebayo","Adeyemi","Afolabi","Agu","Akande","Anyanwu","Balogun","Bello","Chukwu","Danjuma","Eze","Ezeani","Falana","Garba","Ibrahim","Idris","Iheanacho","Johnson","Kalu","Lawal","Musa","Nwosu","Obi","Okafor","Okeke","Okoro","Oladipo","Olawale","Osei","Sani","Soyinka","Udo","Usman","Yakubu","Yusuf","Abubakar","Akinyemi","Bakare","Duru","Etim","Iroko","Jatau","Kehinde","Mordi","Nwachukwu","Ojo","Oni","Salami"];
const roles=["Shopkeeper","Teacher","Student","Nurse","Doctor","Mechanic","Bus driver","Food vendor","Tailor","Artist","Musician","Farmer","Security officer","Cleaner","Engineer","Photographer","Hair stylist","Barber","Electrician","Plumber","Delivery rider","Market trader","Chef","Builder","Librarian","Journalist","Designer","Gardener","Receptionist","Community volunteer"];
const personalities=["warm","cheerful","shy","curious","energetic","calm","outgoing","thoughtful","serious","playful","helpful","reserved"];
const routines=["market","school","clinic","transport","workshop","community","home","garden","creative","hospitality","office","street"];
const greetings=["Good morning! How is your day going?","Welcome around here. Need any help?","Hello there. Lovely weather to be out.","Hi! I was just heading to my next stop.","Good to see you. Have you explored this area?","Hello! There is always something happening nearby."];
const dialogues=["I have a busy day ahead, but I always make time to greet people in the neighbourhood.","Every day brings a new story around here. You just have to pay attention.","I know these streets quite well. There is usually a quicker route if you look around.","People make this place special. Everyone has somewhere to be and a story to tell.","I am taking a short break before getting back to work. What brings you around?","The neighbourhood changes throughout the day. Mornings and evenings feel completely different."];
function seeded(seed:number){let value=seed>>>0;return()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};}
async function ensureNpcCatalogue(db:D1Database){
 const current=await db.prepare("SELECT COUNT(*) AS total FROM npc_profiles").first<{total:number}>();
 if((current?.total??0)>=1200)return;
 const random=seeded(20261118), stamp=new Date().toISOString(), statements:D1Statement[]=[];
 for(let i=0;i<1200;i++){
  const id="population-20261118-"+String(i+1).padStart(4,"0");
  const name=firstNames[i%firstNames.length]+" "+surnames[Math.floor(i/firstNames.length)%surnames.length];
  const role=roles[Math.floor(random()*roles.length)], personality=personalities[Math.floor(random()*personalities.length)], routine=routines[Math.floor(random()*routines.length)];
  const x=random()*40-20, z=random()*40-20, dialogue=dialogues[Math.floor(random()*dialogues.length)], greeting=greetings[Math.floor(random()*greetings.length)];
  statements.push(db.prepare("INSERT OR IGNORE INTO npc_profiles (id,name,role,dialogue,x,z,radius,personality,routine,greeting,appearance_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,name,role,dialogue,x,z,2.8,personality,routine,greeting,JSON.stringify({version:1,source:"ara-starter-preset",seed:id}),stamp));
 }
 for(let i=0;i<statements.length;i+=100) await db.batch(statements.slice(i,i+100));
}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const now=()=>new Date().toISOString();
const validJsonText=(value:unknown,max:number):value is string=>typeof value==="string"&&value.length<=max&&(()=>{try{JSON.parse(value);return true;}catch{return false;}})();
const optionalText=(value:unknown,max:number)=>value===undefined||typeof value==="string"&&value.length<=max;
export default { async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url);
 if(!url.pathname.startsWith("/api/"))return env.ASSETS.fetch(request);
 if(request.method==="OPTIONS")return new Response(null,{status:204});
 let projectOwner: string | null = null;
 let userSubject: string | null = null;
 const isProjectRoute=url.pathname==="/api/projects"||url.pathname.startsWith("/api/projects/");
 const isTaskRoute=url.pathname==="/api/tasks"||url.pathname.startsWith("/api/tasks/");
 const isDirectorRevisionRoute=url.pathname==="/api/director/revisions";
 const isProtectedWrite=
  (url.pathname==="/api/assets/register"&&request.method==="POST")||
  (url.pathname==="/api/assets/generate"&&request.method==="POST")||
  (url.pathname==="/api/assets/generate-3d"&&request.method==="POST")||
  (url.pathname==="/api/npcs/generate"&&request.method==="POST")||
  (url.pathname==="/api/world/generate"&&request.method==="POST")||
  (url.pathname==="/api/director/plan"&&request.method==="POST")||
  (url.pathname==="/api/director/revisions"&&request.method==="POST")||
  (url.pathname.startsWith("/api/npcs/")&&url.pathname.endsWith("/character")&&request.method==="PUT");
 if(isProjectRoute||isTaskRoute||isProtectedWrite||isDirectorRevisionRoute){
  if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return json({error:"Cloudflare Access authentication is not configured."},503);
  const identity=await verifyCloudflareAccess(request,env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUD);
  if(!identity)return json({error:"Authentication required. Sign in through Cloudflare Access."},401);
  userSubject=identity.subject;
  if(isProjectRoute)projectOwner=identity.subject;
 }
 // The shared starter catalogue remains public. When a valid Access assertion
 // is present, include the signed-in creator's private catalogue records too.
 if(url.pathname==="/api/assets"&&request.method==="GET"&&request.headers.has("Cf-Access-Jwt-Assertion")){
  if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return json({error:"Cloudflare Access authentication is not configured."},503);
  const identity=await verifyCloudflareAccess(request,env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUD);
  if(!identity)return json({error:"Authentication required. Sign in through Cloudflare Access."},401);
  userSubject=identity.subject;
 }
 if(url.pathname==="/api/health"&&request.method==="GET"){
  try{
   const probe=await env.DB.prepare("SELECT 1 AS ok").first<{ok:number}>();
   if(probe?.ok!==1)throw new Error("Database readiness probe returned no result.");
   return json({ok:true,service:"nexus-build-api",database:"bound",databaseReady:true,aiAvailable:Boolean(env.AI),staticAssetsBound:Boolean(env.ASSETS),timestamp:now()});
  }catch{
   return json({ok:false,service:"nexus-build-api",database:"unavailable",databaseReady:false,aiAvailable:Boolean(env.AI),staticAssetsBound:Boolean(env.ASSETS),timestamp:now()},503);
  }
 }


 if(url.pathname==="/api/assets"&&request.method==="GET"){
  try{
   const rawLimit=Number(url.searchParams.get("limit")??24),limit=Math.max(1,Math.min(50,Number.isFinite(rawLimit)?Math.floor(rawLimit):24));
   const offset=Math.max(0,Math.floor(Number(url.searchParams.get("offset")??0)||0)),term=(url.searchParams.get("q")??"").trim().slice(0,120),type=(url.searchParams.get("type")??"").trim();
   const clauses:string[]=["(owner_id='legacy-shared' OR owner_id=?)"],args:(string|number)[]=[userSubject??"__anonymous__"];
   if(term){clauses.push("(name LIKE ? OR asset_type LIKE ? OR prompt LIKE ? OR prompt_key LIKE ? OR tags_json LIKE ?)");args.push("%"+term+"%","%"+term+"%","%"+term+"%","%"+term+"%","%"+term+"%");}
   if(type){clauses.push("asset_type = ?");args.push(type);}
   const where=" WHERE "+clauses.join(" AND ");
   const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM asset_catalogue"+where).bind(...args).first<{total:number}>();
   const rows=await env.DB.prepare("SELECT id,name,asset_type,prompt,prompt_key,mime_type,size_bytes,source,model,license,tags_json,created_at,updated_at FROM asset_catalogue"+where+" ORDER BY updated_at DESC LIMIT ? OFFSET ?").bind(...args,limit,offset).all();
   const total=count?.total??0,loaded=rows.results?.length??0;
   return json({assets:rows.results??[],total,limit,offset,nextOffset:offset+loaded<total?offset+loaded:null,source:"cloudflare-d1-metadata"});
  }catch(error){return json({error:error instanceof Error?error.message:"Asset catalogue unavailable."},503);}
 }
 if(url.pathname==="/api/assets/register"&&request.method==="POST"){
  try{
   let body:{id?:string;name?:string;assetType?:string;prompt?:string;promptKey?:string;mimeType?:string;sizeBytes?:number;source?:string;model?:string;license?:string;tags?:unknown};
   try{body=await request.json();}catch{return json({error:"Send valid asset metadata."},400);}
   const idValue=(body.id??"").trim(),name=(body.name??"").trim(),assetType=(body.assetType??"").trim();
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(idValue)||!name||name.length>140||!assetType||assetType.length>40)return json({error:"Asset ID, name and type are required."},400);
   const prompt=(body.prompt??"").trim().slice(0,2048),promptKey=(body.promptKey??"").trim().slice(0,260),mimeType=(body.mimeType??"application/octet-stream").slice(0,100);
   const sizeBytes=Number.isFinite(body.sizeBytes)?Math.max(0,Math.min(100*1024*1024,Math.floor(body.sizeBytes as number))):0;
   const source=body.source==="workers-ai"?"workers-ai":"imported",model=(body.model??"").slice(0,120),license=(body.license??"user-supplied-or-model-terms").slice(0,160);
   const tags=Array.isArray(body.tags)?body.tags.filter((tag):tag is string=>typeof tag==="string").slice(0,24):[];
   const timestamp=now();
   const saved=await env.DB.prepare("INSERT INTO asset_catalogue (id,owner_id,name,asset_type,prompt,prompt_key,mime_type,size_bytes,source,model,license,tags_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,asset_type=excluded.asset_type,prompt=excluded.prompt,prompt_key=excluded.prompt_key,mime_type=excluded.mime_type,size_bytes=excluded.size_bytes,source=excluded.source,model=excluded.model,license=excluded.license,tags_json=excluded.tags_json,updated_at=excluded.updated_at WHERE asset_catalogue.owner_id=excluded.owner_id").bind(idValue,userSubject,name,assetType,prompt,promptKey,mimeType,sizeBytes,source,model,license,JSON.stringify(tags),timestamp,timestamp).run();
   if(!saved.meta?.changes)return json({error:"This asset ID is already owned by another catalogue entry. Choose a new ID."},409);
   return json({saved:true,id:idValue,source:"cloudflare-d1-metadata"},201);
  }catch(error){return json({error:error instanceof Error?error.message:"Could not register asset metadata."},503);}
 }
 if(url.pathname==="/api/assets/generate"&&request.method==="POST"){
  let taskId="";
  try{
   let body:{prompt?:string;assetType?:string};
   try{body=await request.json();}catch{return json({error:"Send a valid asset prompt."},400);}
   const prompt=(body.prompt??"").trim().slice(0,2048),assetType=(body.assetType??"Texture").trim();
   if(prompt.length<12)return json({error:"Describe the asset in at least 12 characters."},400);
   if(!["Texture","Concept art","Sprite"].includes(assetType))return json({error:"Choose Texture, Concept art or Sprite."},400);
   taskId="asset-"+crypto.randomUUID();
   const timestamp=now(),taskInput=JSON.stringify({prompt,assetType,model:"@cf/black-forest-labs/flux-1-schnell"});
   await env.DB.prepare("INSERT INTO generation_tasks (id,owner_id,type,status,input,engine,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(taskId,userSubject,"asset-image","running",taskInput,"cloudflare-workers-ai-flux",timestamp,timestamp).run();
   const imageResult=await env.AI.run("@cf/black-forest-labs/flux-1-schnell",{prompt,steps:4});
   const image=imageResult.image;
   if(typeof image!=="string"||image.length<100||image.length>12000000)throw new Error("Image generation returned an invalid or oversized result.");
   await env.DB.prepare("UPDATE generation_tasks SET status='completed',result_json=?,updated_at=? WHERE id=? AND owner_id=?").bind(JSON.stringify({assetType,mimeType:"image/jpeg",model:"@cf/black-forest-labs/flux-1-schnell",prompt}),now(),taskId,userSubject).run();
   return json({imageDataUrl:"data:image/jpeg;base64,"+image,mimeType:"image/jpeg",model:"@cf/black-forest-labs/flux-1-schnell",taskId,assetType,source:"cloudflare-workers-ai"},201);
  }catch(error){
   if(taskId){try{await env.DB.prepare("UPDATE generation_tasks SET status='failed',error=?,updated_at=? WHERE id=? AND owner_id=?").bind(error instanceof Error?error.message:"Image generation failed.",now(),taskId,userSubject).run();}catch{}}
   return json({error:error instanceof Error?error.message:"AI image generation is temporarily unavailable."},503);
  }
 }
 if(url.pathname==="/api/assets/generate-3d"&&request.method==="POST"){
  let taskId="";
  try{
   let body:{prompt?:string};
   try{body=await request.json();}catch{return json({error:"Send a valid 3D asset description."},400);}
   const prompt=(body.prompt??"").trim().slice(0,1200);
   if(prompt.length<12)return json({error:"Describe the 3D asset in at least 12 characters."},400);
   taskId="asset3d-"+crypto.randomUUID();
   const stamp=now(),input=JSON.stringify({prompt,model:"@cf/meta/llama-3.1-8b-instruct",pipeline:"ai-guided-procedural"});
   await env.DB.prepare("INSERT INTO generation_tasks (id,owner_id,type,status,input,engine,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(taskId,userSubject,"asset-3d","running",input,"workers-ai-procedural-mesh",stamp,stamp).run();
   const instruction="Create a compact 3D game prop from the user's description. Return ONLY JSON with keys name, description, parts. parts must contain 3 to 18 objects. Each object has shape (box, sphere, cylinder, cone, torus), position [x,y,z], scale [x,y,z], color (#RRGGBB), and optional rotation [x,y,z]. Use a coherent low-poly assembly, grounded at y=0, overall dimensions within 6 units. Avoid tiny details. Use varied components to make a recognizable game-ready prop. User description: "+prompt;
   const generated=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:"You are a technical 3D prop designer. Return strict JSON only. Never include markdown."},{role:"user",content:instruction}],max_tokens:1300,temperature:0.35});
   const raw=(generated.response??"").trim(),start=raw.indexOf("{"),end=raw.lastIndexOf("}");
   if(start<0||end<=start)throw new Error("The AI returned an unreadable 3D blueprint. Try a simpler description.");
   const parsed=JSON.parse(raw.slice(start,end+1)) as {name?:unknown;description?:unknown;parts?:unknown};
   if(!Array.isArray(parsed.parts)||parsed.parts.length<3)throw new Error("The AI blueprint did not contain enough mesh components.");
   const shapes=["box","sphere","cylinder","cone","torus"];
   const parts=parsed.parts.slice(0,18).map((part:unknown)=>{
    const p=part as Record<string,unknown>,vector=(value:unknown,fallback:[number,number,number],min:number,max:number):[number,number,number]=>Array.isArray(value)&&value.length===3?value.map(v=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):0))) as [number,number,number]:fallback;
    const shape=shapes.includes(String(p.shape))?String(p.shape):"box";
    const color=typeof p.color==="string"&&/^#[0-9a-fA-F]{6}$/.test(p.color)?p.color:"#9b8068";
    return {shape,position:vector(p.position,[0,0,0],-3,3),scale:vector(p.scale,[1,1,1],0.08,3),rotation:vector(p.rotation,[0,0,0],-6.28,6.28),color};
   });
   const blueprint={name:typeof parsed.name==="string"?parsed.name.slice(0,80):"Generated game prop",description:typeof parsed.description==="string"?parsed.description.slice(0,240):prompt,parts};
   await env.DB.prepare("UPDATE generation_tasks SET status='completed',result_json=?,updated_at=? WHERE id=? AND owner_id=?").bind(JSON.stringify(blueprint),now(),taskId,userSubject).run();
   return json({blueprint,taskId,source:"workers-ai-procedural"},201);
  }catch(error){
   if(taskId){try{await env.DB.prepare("UPDATE generation_tasks SET status='failed',error=?,updated_at=? WHERE id=? AND owner_id=?").bind(error instanceof Error?error.message:"3D generation failed.",now(),taskId,userSubject).run();}catch{}}
   return json({error:error instanceof Error?error.message:"3D asset generation is temporarily unavailable."},503);
  }
 }
 if(url.pathname==="/api/npcs/generate"&&request.method==="POST"){
  try{
   let body:{description?:string;category?:string};
   try{body=await request.json();}catch{return json({error:"Send a valid NPC description."},400);}
   const description=(body.description??"").trim().slice(0,900);
   if(description.length<12)return json({error:"Please describe the NPC in at least 12 characters."},400);
   const category=(body.category??"All").trim();
   const categoryRoles:Record<string,string[]>={Business:["Shopkeeper","Food vendor","Market trader","Chef","Receptionist"],Education:["Teacher","Student","Librarian"],Healthcare:["Nurse","Doctor"],Transport:["Bus driver","Delivery rider"],Creative:["Artist","Musician","Photographer","Hair stylist","Barber","Designer","Journalist"],"Skilled trades":["Mechanic","Tailor","Engineer","Electrician","Plumber","Builder","Farmer","Gardener"],"Public services":["Security officer","Cleaner"],Community:["Community volunteer"]};
   const allowedRoles=categoryRoles[category]??roles;
   const prompt="Create one original, believable game NPC from this description. Return ONLY a valid JSON object, no markdown.\nDescription: "+description+"\nSelected category: "+category+"\nChoose role from this exact list: "+allowedRoles.join(", ")+".\nReturn keys: name, role, personality, routine, greeting, dialogue, appearanceDescription, preset, outfit, shoes, carry, dailySchedule, behaviourNotes.\nRules: name is a plausible full name; role must exactly match an allowed role; personality is a concise trait phrase; routine is a short setting/routine label; greeting is one natural sentence; dialogue is 2-3 natural sentences; appearanceDescription describes visible clothing, hair and accessories without claiming a unique generated mesh; preset must be one of The Female Executive, The Adventurer, The Detective, The Athlete; outfit, shoes and carry are 6-digit hex colours; dailySchedule and behaviourNotes are short and practical. Keep the character suitable for a general-audience game.";
   const generated=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:"You are a game character designer. Follow the schema exactly and return valid JSON only."},{role:"user",content:prompt}],max_tokens:850,temperature:0.75});
   const raw=(generated.response??"").trim(),start=raw.indexOf("{"),end=raw.lastIndexOf("}");
   if(start<0||end<=start)throw new Error("The AI returned an unreadable character profile. Please try again.");
   const character=JSON.parse(raw.slice(start,end+1)) as Record<string,unknown>;
   const textField=(key:string,max:number,fallback:string)=>typeof character[key]==="string"?(character[key] as string).trim().slice(0,max)||fallback:fallback;
   const role=allowedRoles.includes(String(character.role))?String(character.role):allowedRoles[0];
   const validHex=(value:unknown,fallback:string)=>typeof value==="string"&&/^#[0-9a-fA-F]{6}$/.test(value)?value:fallback;
   const presets=["The Female Executive","The Adventurer","The Detective","The Athlete"];
   const preset=presets.includes(String(character.preset))?String(character.preset):"The Adventurer";
   const id="custom-"+crypto.randomUUID(),timestamp=now();
   const humanFeatures={breathing:true,blinking:true,naturalIdle:true,walking:true,running:true,collision:true,obstacleAwareness:true,sitting:true,standing:true,resting:true,dailyRoutines:true,socialInteraction:true,objectInteraction:true,coughing:true,sneezing:true,hiccups:true,yawning:true,sweating:true,stretching:true,facialExpressions:false,advancedConversations:false,longTermMemory:false,advancedProceduralAnimation:false,environmentalNeeds:false};
   const appearance={version:1,humanFoundationVersion:1,humanFeatures,source:"cloudflare-workers-ai+ara3d",engine:"ara3d",description:textField("appearanceDescription",500,"Custom character appearance"),dailySchedule:textField("dailySchedule",500,"Follows a daily routine"),behaviourNotes:textField("behaviourNotes",500,"Uses the shared human behaviour foundation"),preset,outfit:validHex(character.outfit,"#6685a8"),shoes:validHex(character.shoes,"#29252b"),carry:validHex(character.carry,"#8a6549")};
   const npc={id,name:textField("name",80,"New Resident"),role,dialogue:textField("dialogue",700,"I enjoy being part of this neighbourhood."),x:0,z:0,radius:2.8,personality:textField("personality",120,"friendly and curious"),routine:textField("routine",100,"community"),greeting:textField("greeting",240,"Hello! Nice to meet you."),appearance_json:JSON.stringify(appearance),preview_url:null,model_url:null,created_at:timestamp};
   await env.DB.prepare("INSERT INTO npc_profiles (id,name,role,dialogue,x,z,radius,personality,routine,greeting,appearance_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(npc.id,npc.name,npc.role,npc.dialogue,npc.x,npc.z,npc.radius,npc.personality,npc.routine,npc.greeting,npc.appearance_json,npc.created_at).run();
   return json({npc,source:"cloudflare-workers-ai",saved:true},201);
  }catch(error){
   const message=error instanceof Error?error.message:"NPC generation is temporarily unavailable.";
   return json({error:message.includes("AI")||message.includes("binding")?"AI character generation is not available on this Worker yet. Check the Workers AI binding in Cloudflare and try again.":message},503);
  }
 }
 const characterMatch=url.pathname.match(/^\/api\/npcs\/([a-zA-Z0-9_-]+)\/character$/);
 if(characterMatch&&request.method==="PUT"){
  try{
   const id=decodeURIComponent(characterMatch[1]);
   let body:{config?:unknown};
   try{body=await request.json();}catch{return json({error:"Send a valid character configuration."},400);}
   if(!body.config||typeof body.config!=="object"||Array.isArray(body.config))return json({error:"A valid HumanForge character configuration is required."},400);
   const encoded=JSON.stringify(body.config);
   if(encoded.length>60000)return json({error:"Character configuration is too large to save."},413);
   const existing=await env.DB.prepare("SELECT appearance_json FROM npc_profiles WHERE id=?").bind(id).first<{appearance_json:string}>();
   if(!existing)return json({error:"NPC profile not found."},404);
   let appearance:Record<string,unknown>={};
   try{const parsed=JSON.parse(existing.appearance_json||"{}");if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))appearance=parsed;}catch{}
   appearance.humanConfig=body.config;
   appearance.humanConfigUpdatedAt=now();
   await env.DB.prepare("UPDATE npc_profiles SET appearance_json=? WHERE id=?").bind(JSON.stringify(appearance),id).run();
   return json({saved:true,id});
  }catch(error){return json({error:error instanceof Error?error.message:"Could not save this character."},500);}
 }
 if(url.pathname==="/api/npcs"&&request.method==="GET"){
  try{
   await ensureNpcCatalogue(env.DB);
   const rawLimit=Number(url.searchParams.get("limit")??24),limit=Math.max(1,Math.min(48,Number.isFinite(rawLimit)?Math.floor(rawLimit):24));
   const offset=Math.max(0,Math.floor(Number(url.searchParams.get("offset")??0)||0)),term=(url.searchParams.get("q")??"").trim(),category=url.searchParams.get("category")??"All";
   const categoryRoles:Record<string,string[]>={Business:["Shopkeeper","Food vendor","Market trader","Chef","Receptionist"],Education:["Teacher","Student","Librarian"],Healthcare:["Nurse","Doctor"],Transport:["Bus driver","Delivery rider"],Creative:["Artist","Musician","Photographer","Hair stylist","Barber","Designer","Journalist"],"Skilled trades":["Mechanic","Tailor","Engineer","Electrician","Plumber","Builder","Farmer","Gardener"],"Public services":["Security officer","Cleaner"],Community:["Community volunteer"]};
   // Describe mode expands everyday wording into the catalogue's indexed NPC vocabulary.
   const describe=url.searchParams.get("mode")==="describe";
   const rawTokens=term.toLowerCase().match(/[\\p{L}\\p{N}_]+/gu)??[];
   const stopWords=new Set(["a","an","the","and","or","with","in","at","on","of","for","who","that","is","wearing","working","works","from","very","some","someone","person","npc","character","make","find","show","me","please","want","looking","like","their","his","her","they","has","have","to","be","around","late","early","twenties","thirties","years","old"]);
   const synonymGroups:Record<string,string[]>={friendly:["warm","cheerful","helpful","outgoing"],kind:["warm","helpful","thoughtful"],quiet:["shy","reserved","calm"],introverted:["shy","reserved"],happy:["cheerful","playful"],lively:["energetic","outgoing"],doctor:["Doctor","clinic","hospital"],medic:["Nurse","Doctor","clinic"],nurse:["Nurse","clinic","healthcare"],hospital:["clinic","Nurse","Doctor"],teacher:["Teacher","school","Education"],professor:["Teacher","school"],student:["Student","school"],driver:["Bus driver","transport"],bus:["Bus driver","transport"],mechanic:["Mechanic","workshop"],builder:["Builder","workshop"],trader:["Market trader","Shopkeeper","market"],seller:["Shopkeeper","Food vendor","market"],chef:["Chef","hospitality"],cook:["Chef","Food vendor"],artist:["Artist","creative"],musician:["Musician","creative"],security:["Security officer","community"],police:["Security officer","community"],farmer:["Farmer","garden"],gardener:["Gardener","garden"],hairdresser:["Hair stylist","Barber"],barber:["Barber","Hair stylist"],calm:["calm","reserved","thoughtful"],energetic:["energetic","outgoing"],shy:["shy","reserved"],playful:["playful","cheerful"],helpful:["helpful","warm"],market:["market","Market trader","Shopkeeper"],school:["school","Teacher","Student"],clinic:["clinic","Nurse","Doctor"],office:["office","Receptionist"],workshop:["workshop","Mechanic","Electrician"]};
   const meaningful=rawTokens.filter(token=>!stopWords.has(token));
   const expanded=[...new Set(meaningful.flatMap(token=>synonymGroups[token]??[token]))].slice(0,24);
   // Standard search requires all terms; description search accepts any indexed clue and ranks matches.
   const ftsQuery=expanded.map(token=>'"'+token.replace(/"/g,'""')+'"*').join(describe?" OR ":" AND ");
   const selectedRoles=categoryRoles[category];
   const roleClause=selectedRoles?" AND p.role IN ("+selectedRoles.map(()=>"?").join(",")+")":"";
   const roleArgs:(string|number)[]=selectedRoles?[...selectedRoles]:[];
   let count:{total:number}|null;
   let rows:D1Result;
   if(ftsQuery){
    const matchFrom=" FROM npc_profiles_fts JOIN npc_profiles p ON p.rowid=npc_profiles_fts.rowid WHERE npc_profiles_fts MATCH ?"+roleClause;
    count=await env.DB.prepare("SELECT COUNT(*) AS total"+matchFrom).bind(ftsQuery,...roleArgs).first<{total:number}>();
    rows=await env.DB.prepare("SELECT p.id,p.name,p.role,p.dialogue,p.x,p.z,p.radius,p.personality,p.routine,p.greeting,p.appearance_json,p.preview_url,p.model_url"+matchFrom+" ORDER BY bm25(npc_profiles_fts),p.id LIMIT ? OFFSET ?").bind(ftsQuery,...roleArgs,limit,offset).all();
   }else{
    const where=selectedRoles?" WHERE role IN ("+selectedRoles.map(()=>"?").join(",")+")":"";
    count=await env.DB.prepare("SELECT COUNT(*) AS total FROM npc_profiles"+where).bind(...roleArgs).first<{total:number}>();
    rows=await env.DB.prepare("SELECT id,name,role,dialogue,x,z,radius,personality,routine,greeting,appearance_json,preview_url,model_url FROM npc_profiles"+where+" ORDER BY id LIMIT ? OFFSET ?").bind(...roleArgs,limit,offset).all();
   }
   const total=count?.total??0,loaded=rows.results?.length??0;
   return json({npcs:rows.results??[],total,limit,offset,nextOffset:offset+loaded<total?offset+loaded:null,source:"cloudflare-d1",searchMode:describe?"description-match":ftsQuery?"fts5":"catalogue"});
  }catch(error){return json({error:error instanceof Error?error.message:"NPC catalogue unavailable."},503);}
 }
 if(url.pathname==="/api/world/generate"&&request.method==="POST"){
  let body:{prompt?:string;biome?:WorldBiome;size?:"compact"|"standard"|"large"};
  try{body=await request.json();}catch{return json({error:"Send a valid world description."},400);}
  const prompt=(body.prompt??"").trim().slice(0,1800),biome=(body.biome??"city") as WorldBiome,size=body.size??"standard";
  if(prompt.length<12)return json({error:"Please describe the world in at least 12 characters."},400);
  if(!["city","village","fantasy","forest","desert","sci-fi"].includes(biome)||!["compact","standard","large"].includes(size))return json({error:"Choose a supported environment and world size."},400);
  const taskId=crypto.randomUUID(),stamp=now();
  try{await env.DB.prepare("INSERT INTO generation_tasks (id,owner_id,type,status,input,engine,created_at,updated_at) VALUES (?,?,?, 'running',?,?,?,?)").bind(taskId,userSubject,"world-scene",prompt,"three",stamp,stamp).run();}
  catch{return json({error:"Could not create a world-generation task. Check the generation task migration."},503);}
  let world=createFallbackWorld(prompt,biome,size),source="procedural-fallback";
  try{
   const instruction="Design a compact 3D game scene using only the supported primitive object types. Return ONLY JSON: {name,description,lighting,objects:[{name,kind,position:[x,y,z],rotation:[x,y,z],scale:[x,y,z],color}]}. Supported kind values: building, tree, road, car, cube, sphere, cylinder, cone, torus, plane. Create 18 to 45 useful objects with a coherent navigable layout, a clear central play area and sensible spacing. Coordinates must be within -18..18, scales 0.1..8, colours hex #RRGGBB. Keep the central spawn area near [0,0,0] clear. Do not use text or markdown. General-audience game environment only.";
   const generated=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:instruction},{role:"user",content:"World biome: "+biome+". Size: "+size+". World description: "+prompt}],max_tokens:1800,temperature:.45});
   const raw=(generated.response??"").trim(),start=raw.indexOf("{"),end=raw.lastIndexOf("}");
   if(start>=0&&end>start){
    const parsed=JSON.parse(raw.slice(start,end+1)) as Record<string,unknown>,objects=sanitizeWorldObjects(parsed.objects);
    if(objects.length>=10){
     world={...world,name:typeof parsed.name==="string"?parsed.name.slice(0,64):world.name,description:typeof parsed.description==="string"?parsed.description.slice(0,500):world.description,objects,lighting:parsed.lighting==="night"||parsed.lighting==="sunset"?"sunset":"day",generatedAt:now()};
     if(!validateWorldPlan(world).length)source="workers-ai";
    }
   }
  }catch{}
  const result=JSON.stringify(world);
  try{await env.DB.prepare("UPDATE generation_tasks SET status='completed',result_json=?,updated_at=? WHERE id=? AND owner_id=?").bind(result,now(),taskId,userSubject).run();}
  catch{return json({error:"World was generated but its task record could not be saved. Please retry."},503);}
  return json({world,source,taskId,objectCount:world.objects.length,validated:validateWorldPlan(world).length===0});
 }
 if(url.pathname==="/api/director/revisions"&&request.method==="GET"){
  try{
   const rawLimit=Number(url.searchParams.get("limit")??20),limit=Math.max(1,Math.min(50,Number.isFinite(rawLimit)?Math.floor(rawLimit):20));
   const rows=await env.DB.prepare("SELECT id,task_id,title,blueprint_json,created_at FROM blueprint_revisions WHERE owner_id=? ORDER BY created_at DESC LIMIT ?").bind(userSubject,limit).all();
   return json({revisions:(rows.results??[]).map((row:any)=>({id:row.id,taskId:row.task_id,title:row.title,blueprint:JSON.parse(String(row.blueprint_json)),createdAt:row.created_at}))});
  }catch{return json({error:"Could not load blueprint revision history."},503);}
 }
 if(url.pathname==="/api/director/revisions"&&request.method==="POST"){
  let body:{taskId?:string;blueprint?:unknown};
  try{body=await request.json();}catch{return json({error:"Send a valid blueprint revision."},400);}
  if(!body.blueprint||validateBlueprint(body.blueprint).length)return json({error:"Only a valid game blueprint can be saved to revision history."},400);
  const blueprint=body.blueprint as GameBlueprint,serialized=JSON.stringify(blueprint);
  if(serialized.length>180000)return json({error:"Blueprint is too large to save in revision history."},413);
  const id=crypto.randomUUID(),stamp=now(),taskId=typeof body.taskId==="string"?body.taskId.slice(0,80):"";
  try{
   await env.DB.prepare("INSERT INTO blueprint_revisions (id,owner_id,task_id,title,blueprint_json,created_at) VALUES (?,?,?,?,?,?)").bind(id,userSubject,taskId,blueprint.title.slice(0,80),serialized,stamp).run();
   await env.DB.prepare("DELETE FROM blueprint_revisions WHERE owner_id=? AND id NOT IN (SELECT id FROM blueprint_revisions WHERE owner_id=? ORDER BY created_at DESC LIMIT 50)").bind(userSubject,userSubject).run();
   return json({revision:{id,taskId,title:blueprint.title,blueprint,createdAt:stamp}},201);
  }catch{return json({error:"Could not save blueprint revision. Apply migration 0010 and retry."},503);}
 }
 if(url.pathname==="/api/director/plan"&&request.method==="POST"){
  let body:{prompt?:string;engine?:EngineId;refinement?:string;refinementTarget?:string;existingBlueprint?:unknown};
  try{body=await request.json();}catch{return json({error:"Send a valid game description."},400);}
  const prompt=(body.prompt??"").trim().slice(0,2400),requested=(body.engine??"auto") as EngineId,refinement=(body.refinement??"").trim().slice(0,800),refinementTarget=(body.refinementTarget??"overall").trim().slice(0,40);
  if(prompt.length<12)return json({error:"Please describe the game in at least 12 characters."},400);
  if(!["auto","three","godot"].includes(requested))return json({error:"Choose a registered engine option."},400);
  let previous:GameBlueprint|null=null;
   if(body.existingBlueprint!==undefined){
    const candidate=body.existingBlueprint as GameBlueprint;
    if(validateBlueprint(candidate).length)return json({error:"The existing blueprint is invalid and cannot be refined."},400);
    previous=candidate;
   }
   if(refinement&&!previous)return json({error:"Generate a blueprint before requesting a refinement."},400);
   let blueprint:GameBlueprint|null=null,source="local-fallback";
  try{
   const instruction="Create or refine a practical game design blueprint. Return ONLY JSON with keys: title, genre, camera, targetPlatform, summary, player {role,goal,abilities}, world {setting,environment,regions}, coreLoop (3-6 strings), mechanics (3-8 strings), progression (3-6 strings), assetNeeds (3-8 strings), designPillars (3-5 strings), implementationPhases (3-5 objects with name,goal,systems), technicalRisks (2-5 strings). For refinements, preserve existing decisions unless the creator asks to change them; apply the request consistently. When a refinement target is supplied, prioritize that section and avoid unrelated changes. Keep systems achievable for a staged game project. Do not claim to generate finished 3D assets or a complete playable game. Keep content suitable for a general audience. Use concise, actionable entries.";
   const userContent="Game idea: "+prompt+(previous?"\nExisting blueprint to refine: "+JSON.stringify(previous):"")+(refinement?"\nCreator refinement target: "+refinementTarget+"\nCreator refinement request: "+refinement:"");
    const generated=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:instruction},{role:"user",content:userContent}],max_tokens:1250,temperature:.3});
   const raw=(generated.response??"").trim(),start=raw.indexOf("{"),end=raw.lastIndexOf("}");
   if(start>=0&&end>start){
    const parsed=JSON.parse(raw.slice(start,end+1)) as Record<string,unknown>;
    const list=(v:unknown,fallback:string[])=>Array.isArray(v)?v.filter(x=>typeof x==="string").map(x=>(x as string).slice(0,180)).slice(0,10):fallback;
    const player=parsed.player&&typeof parsed.player==="object"?parsed.player as Record<string,unknown>:{};
    const world=parsed.world&&typeof parsed.world==="object"?parsed.world as Record<string,unknown>:{};
    const fallback=previous??createFallbackBlueprint(prompt,requested,true);
    blueprint={...fallback,title:typeof parsed.title==="string"?parsed.title.slice(0,80):fallback.title,genre:typeof parsed.genre==="string"?parsed.genre.slice(0,60):fallback.genre,camera:typeof parsed.camera==="string"?parsed.camera.slice(0,80):fallback.camera,targetPlatform:typeof parsed.targetPlatform==="string"?parsed.targetPlatform.slice(0,100):fallback.targetPlatform,summary:typeof parsed.summary==="string"?parsed.summary.slice(0,600):fallback.summary,player:{role:typeof player.role==="string"?player.role.slice(0,120):fallback.player.role,goal:typeof player.goal==="string"?player.goal.slice(0,240):fallback.player.goal,abilities:list(player.abilities,fallback.player.abilities)},world:{setting:typeof world.setting==="string"?world.setting.slice(0,300):fallback.world.setting,environment:list(world.environment,fallback.world.environment),regions:list(world.regions,fallback.world.regions)},coreLoop:list(parsed.coreLoop,fallback.coreLoop),mechanics:list(parsed.mechanics,fallback.mechanics),progression:list(parsed.progression,fallback.progression),assetNeeds:list(parsed.assetNeeds,fallback.assetNeeds),designPillars:list(parsed.designPillars,fallback.designPillars??[]),implementationPhases:Array.isArray(parsed.implementationPhases)?parsed.implementationPhases.filter((p:any)=>p&&typeof p.name==="string"&&typeof p.goal==="string"&&Array.isArray(p.systems)).slice(0,5).map((p:any)=>({name:p.name.slice(0,100),goal:p.goal.slice(0,220),systems:list(p.systems,[])})):fallback.implementationPhases,technicalRisks:list(parsed.technicalRisks,fallback.technicalRisks??[]),engine:chooseEngine(requested),processing:chooseProcessingMode(prompt,true),createdAt:now()};
    if(!validateBlueprint(blueprint).length)source="workers-ai";else blueprint=null;
   }
  }catch{}
  if(!blueprint)blueprint=previous??createFallbackBlueprint(prompt,requested,false);
  return json({blueprint,source,aiAvailable:Boolean(env.AI),validated:validateBlueprint(blueprint).length===0});
 }
 if(url.pathname==="/api/tasks"&&request.method==="GET"){
  const limit=Math.min(50,Math.max(1,Number(url.searchParams.get("limit"))||20));
  const rows=await env.DB.prepare("SELECT id,type,status,input,engine,result_json,error,created_at,updated_at FROM generation_tasks WHERE owner_id=? ORDER BY created_at DESC LIMIT ?").bind(userSubject,limit).all();
  return json({tasks:(rows.results??[]).map((row:any)=>({...row,result:row.result_json?JSON.parse(String(row.result_json)):null,createdAt:row.created_at,updatedAt:row.updated_at}))});
 }
 if(url.pathname==="/api/tasks"&&request.method==="POST"){
  let body:{type?:string;input?:string;engine?:string};
  try{body=await request.json();}catch{return json({error:"Send a valid task object."},400);}
  const type=(body.type??"").trim(),input=(body.input??"").trim(),engine=body.engine??"auto";
  if(!type||type.length>80||input.length<1||input.length>4000||!["auto","three","godot"].includes(engine))return json({error:"Task type, input or engine is invalid."},400);
  const id=crypto.randomUUID(),stamp=now();
  try{await env.DB.prepare("INSERT INTO generation_tasks (id,owner_id,type,status,input,engine,created_at,updated_at) VALUES (?,?,?, 'queued',?,?,?,?)").bind(id,userSubject,type,input,engine,stamp,stamp).run();return json({task:{id,type,status:"queued",input,engine,createdAt:stamp,updatedAt:stamp}},201);}
  catch{return json({error:"Could not store generation task. Apply migration 0005 and retry."},503);}
 }
 const taskMatch=url.pathname.match(/^\/api\/tasks\/([a-f0-9-]+)$/i);
 if(taskMatch&&request.method==="PATCH"){
  let body:{status?:string;result?:unknown;error?:string};
  try{body=await request.json();}catch{return json({error:"Send a valid task update."},400);}
  if(!body||!["queued","running","completed","failed"].includes(body.status??""))return json({error:"Invalid task status."},400);
  const resultJson=body.result===undefined?null:JSON.stringify(body.result);
  if(resultJson&&resultJson.length>180000)return json({error:"Task result is too large to store."},413);
  const stamp=now();
  try{
   const updated=await env.DB.prepare("UPDATE generation_tasks SET status=?,result_json=COALESCE(?,result_json),error=?,updated_at=? WHERE id=? AND owner_id=?").bind(body.status,resultJson,body.error?.slice(0,1000)??null,stamp,taskMatch[1],userSubject).run();
   if(!updated.meta?.changes)return json({error:"Generation task not found."},404);
   const row=await env.DB.prepare("SELECT id,type,status,input,engine,result_json,error,created_at,updated_at FROM generation_tasks WHERE id=? AND owner_id=?").bind(taskMatch[1],userSubject).first<Record<string,unknown>>();
   return json({task:row?{...row,result:row.result_json?JSON.parse(String(row.result_json)):null,createdAt:row.created_at,updatedAt:row.updated_at}:null});
  }catch{return json({error:"Could not update generation task."},503);}
 }
 if(url.pathname==="/api/projects"&&request.method==="GET"){
  try{
   const result=await env.DB.prepare("SELECT id,name,description,prompt,status,scene_json,created_at,updated_at FROM projects WHERE owner_id=? ORDER BY updated_at DESC").bind(projectOwner).all();
   return json({projects:result.results??[]});
  }catch{return json({error:"Could not load projects right now. Please try again."},503);}
 }
 if(url.pathname==="/api/projects"&&request.method==="POST"){
  let body:{name?:string;description?:string;prompt?:string;scene_json?:string};
  try{body=await request.json();}catch{return json({error:"Request body must be valid JSON."},400);}
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"A project object is required."},400);
  const name=body.name?.trim();
  if(!name)return json({error:"Project name is required."},400);
  if(name.length>100||!optionalText(body.description,2000)||!optionalText(body.prompt,12000))return json({error:"Project name, description or prompt exceeds the allowed length."},400);
  const scene=body.scene_json??"{}";
  if(!validJsonText(scene,262144))return json({error:"Scene data must be valid JSON and no larger than 256 KB."},400);
  try{
   const id=crypto.randomUUID(),timestamp=now(),description=body.description?.trim()??"",prompt=body.prompt?.trim()??"";
   await env.DB.prepare("INSERT INTO projects (id,owner_id,name,description,prompt,status,scene_json,created_at,updated_at) VALUES (?,?,?,?,?,'draft',?,?,?)").bind(id,projectOwner,name,description,prompt,scene,timestamp,timestamp).run();
   return json({project:{id,name,description,prompt,status:"draft",scene_json:scene,created_at:timestamp,updated_at:timestamp}},201);
  }catch{return json({error:"Could not save the project. Please try again."},503);}
 }
 const match=url.pathname.match(new RegExp("^/api/projects/([a-f0-9-]+)$","i"));
 if(match&&request.method==="GET"){
  try{
   const project=await env.DB.prepare("SELECT id,name,description,prompt,status,scene_json,created_at,updated_at FROM projects WHERE id = ? AND owner_id = ?").bind(match[1],projectOwner).first();
   return project?json({project}):json({error:"Project not found."},404);
  }catch{return json({error:"Could not load this project right now. Please try again."},503);}
 }
 if(match&&request.method==="PATCH"){
  let body:{name?:string;description?:string;prompt?:string;status?:string;scene_json?:string};
  try{body=await request.json();}catch{return json({error:"Request body must be valid JSON."},400);}
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"A project update object is required."},400);
  if(body.name!==undefined&&(typeof body.name!=="string"||!body.name.trim()||body.name.trim().length>100))return json({error:"Project name must contain 1–100 characters."},400);
  if(!optionalText(body.description,2000)||!optionalText(body.prompt,12000))return json({error:"Project description or prompt exceeds the allowed length."},400);
  if(body.scene_json!==undefined&&!validJsonText(body.scene_json,262144))return json({error:"Scene data must be valid JSON and no larger than 256 KB."},400);
  const existing=await env.DB.prepare("SELECT id FROM projects WHERE id = ? AND owner_id = ?").bind(match[1],projectOwner).first();if(!existing)return json({error:"Project not found."},404);
  const allowed=["draft","planning","prototype","archived"];if(body.status!==undefined&&!allowed.includes(body.status))return json({error:"Invalid project status."},400);
  try{
   await env.DB.prepare("UPDATE projects SET name=COALESCE(?,name),description=COALESCE(?,description),prompt=COALESCE(?,prompt),status=COALESCE(?,status),scene_json=COALESCE(?,scene_json),updated_at=? WHERE id=? AND owner_id=?").bind(body.name?.trim()??null,body.description??null,body.prompt??null,body.status??null,body.scene_json??null,now(),match[1],projectOwner).run();
   const project=await env.DB.prepare("SELECT id,name,description,prompt,status,scene_json,created_at,updated_at FROM projects WHERE id = ? AND owner_id = ?").bind(match[1],projectOwner).first();return project?json({project}):json({error:"Project could not be loaded after updating."},503);
  }catch{return json({error:"Could not update the project. Please try again."},503);}
 }
 if(match&&request.method==="DELETE"){
  try{
   const result=await env.DB.prepare("DELETE FROM projects WHERE id = ? AND owner_id = ?").bind(match[1],projectOwner).run();
   if(!result.meta?.changes)return json({error:"Project not found."},404);
   return json({deleted:true,id:match[1]});
  }catch{return json({error:"Could not delete this project right now. Please try again."},503);}
 }
 return json({error:"API route not found."},404);
}};
