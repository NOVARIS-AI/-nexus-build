interface D1Result<T = Record<string, unknown>> { results?: T[]; success: boolean; meta?: { changes?: number }; }
interface D1Statement { bind(...values: unknown[]): D1Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; run(): Promise<D1Result>; }
interface D1Database { prepare(query: string): D1Statement; batch(statements: D1Statement[]): Promise<D1Result[]>; }
interface Env { DB: D1Database; ASSETS: { fetch(request: Request): Promise<Response> }; }
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
export default { async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url);
 if(!url.pathname.startsWith("/api/"))return env.ASSETS.fetch(request);
 if(request.method==="OPTIONS")return new Response(null,{status:204});
 if(url.pathname==="/api/health"&&request.method==="GET")return json({ok:true,service:"nexus-build-api",database:"bound",timestamp:now()});
 if(url.pathname==="/api/npcs"&&request.method==="GET"){
  try{
   await ensureNpcCatalogue(env.DB);
   const rawLimit=Number(url.searchParams.get("limit")??24),limit=Math.max(1,Math.min(48,Number.isFinite(rawLimit)?Math.floor(rawLimit):24));
   const offset=Math.max(0,Math.floor(Number(url.searchParams.get("offset")??0)||0)),term=(url.searchParams.get("q")??"").trim().toLowerCase().replace(/[%_]/g,""),category=url.searchParams.get("category")??"All";
   const categoryRoles:Record<string,string[]>={Business:["Shopkeeper","Food vendor","Market trader","Chef","Receptionist"],Education:["Teacher","Student","Librarian"],Healthcare:["Nurse","Doctor"],Transport:["Bus driver","Delivery rider"],Creative:["Artist","Musician","Photographer","Hair stylist","Barber","Designer","Journalist"],"Skilled trades":["Mechanic","Tailor","Engineer","Electrician","Plumber","Builder","Farmer","Gardener"],"Public services":["Security officer","Cleaner"],Community:["Community volunteer"]};
   const clauses:string[]=[],args:(string|number)[]=[];
   if(term){clauses.push("(lower(name) LIKE ? OR lower(role) LIKE ? OR lower(personality) LIKE ? OR lower(routine) LIKE ? OR lower(id) LIKE ?)");const like="%"+term+"%";args.push(like,like,like,like,like);}
   const selectedRoles=categoryRoles[category];if(selectedRoles){clauses.push("role IN ("+selectedRoles.map(()=>"?").join(",")+")");args.push(...selectedRoles);}
   const where=clauses.length?" WHERE "+clauses.join(" AND "):"";
   const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM npc_profiles"+where).bind(...args).first<{total:number}>();
   const rows=await env.DB.prepare("SELECT id,name,role,dialogue,x,z,radius,personality,routine,greeting,appearance_json,preview_url,model_url FROM npc_profiles"+where+" ORDER BY id LIMIT ? OFFSET ?").bind(...args,limit,offset).all();
   const total=count?.total??0,loaded=rows.results?.length??0;
   return json({npcs:rows.results??[],total,limit,offset,nextOffset:offset+loaded<total?offset+loaded:null,source:"cloudflare-d1"});
  }catch(error){return json({error:error instanceof Error?error.message:"NPC catalogue unavailable."},503);}
 }
 if(url.pathname==="/api/projects"&&request.method==="GET"){
  const result=await env.DB.prepare("SELECT id,name,description,prompt,status,scene_json,created_at,updated_at FROM projects ORDER BY updated_at DESC").all();
  return json({projects:result.results??[]});
 }
 if(url.pathname==="/api/projects"&&request.method==="POST"){
  let body:{name?:string;description?:string;prompt?:string;scene_json?:string};
  try{body=await request.json();}catch{return json({error:"Request body must be valid JSON."},400);}
  const name=body.name?.trim();if(!name)return json({error:"Project name is required."},400);
  const id=crypto.randomUUID(),timestamp=now();
  await env.DB.prepare("INSERT INTO projects (id,name,description,prompt,status,scene_json,created_at,updated_at) VALUES (?,?,?,?,'draft',?,?,?)").bind(id,name,body.description?.trim()??"",body.prompt?.trim()??"",body.scene_json??"{}",timestamp,timestamp).run();
  return json({project:{id,name,description:body.description?.trim()??"",prompt:body.prompt?.trim()??"",status:"draft",scene_json:body.scene_json??"{}",created_at:timestamp,updated_at:timestamp}},201);
 }
 const match=url.pathname.match(new RegExp("^/api/projects/([a-f0-9-]+)$","i"));
 if(match&&request.method==="GET"){
  const project=await env.DB.prepare("SELECT id,name,description,prompt,status,scene_json,created_at,updated_at FROM projects WHERE id = ?").bind(match[1]).first();
  return project?json({project}):json({error:"Project not found."},404);
 }
 if(match&&request.method==="PATCH"){
  let body:{name?:string;description?:string;prompt?:string;status?:string;scene_json?:string};
  try{body=await request.json();}catch{return json({error:"Request body must be valid JSON."},400);}
  const existing=await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(match[1]).first();if(!existing)return json({error:"Project not found."},404);
  const allowed=["draft","planning","prototype","archived"];if(body.status&&!allowed.includes(body.status))return json({error:"Invalid project status."},400);
  await env.DB.prepare("UPDATE projects SET name=COALESCE(?,name),description=COALESCE(?,description),prompt=COALESCE(?,prompt),status=COALESCE(?,status),scene_json=COALESCE(?,scene_json),updated_at=? WHERE id=?").bind(body.name?.trim()||null,body.description??null,body.prompt??null,body.status??null,body.scene_json??null,now(),match[1]).run();
  const project=await env.DB.prepare("SELECT id,name,description,prompt,status,scene_json,created_at,updated_at FROM projects WHERE id = ?").bind(match[1]).first();return json({project});
 }
 if(match&&request.method==="DELETE"){
  const result=await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(match[1]).run();if(!result.meta?.changes)return json({error:"Project not found."},404);return json({deleted:true,id:match[1]});
 }
 return json({error:"API route not found."},404);
}};
