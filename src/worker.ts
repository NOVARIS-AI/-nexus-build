interface D1Result<T = Record<string, unknown>> { results?: T[]; success: boolean; meta?: { changes?: number }; }
interface D1Statement { bind(...values: unknown[]): D1Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; run(): Promise<D1Result>; }
interface D1Database { prepare(query: string): D1Statement; batch(statements: D1Statement[]): Promise<D1Result[]>; }
interface WorkersAI { run(model:string,input:{messages:{role:"system"|"user"|"assistant";content:string}[];max_tokens?:number;temperature?:number}):Promise<{response?:string}>; }
interface Env { DB: D1Database; AI: WorkersAI; ASSETS: { fetch(request: Request): Promise<Response> }; }
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
