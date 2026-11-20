export type EngineId = "auto" | "three" | "godot";
export type EngineCapability = "web-preview" | "scene-editing" | "physics" | "export" | "mobile";
export type EngineRegistration = { id: Exclude<EngineId,"auto">; name:string; status:"active"|"planned"; role:string; capabilities:EngineCapability[]; notes:string };
export const ENGINE_REGISTRY:EngineRegistration[]=[
 {id:"three",name:"Three.js",status:"active",role:"Interactive browser preview and scene editing",capabilities:["web-preview","scene-editing","physics","mobile"],notes:"Current live 3D preview engine. Browser physics and gameplay systems are being expanded."},
 {id:"godot",name:"Godot",status:"planned",role:"Standalone game runtime and export target",capabilities:["physics","export","mobile"],notes:"Planned adapter. Projects remain portable and are not locked to one engine."}
];
export type GameBlueprint={
 version:1; title:string; genre:string; camera:string; targetPlatform:string; summary:string;
 player:{role:string;goal:string;abilities:string[]};
 world:{setting:string;environment:string[];regions:string[]};
 coreLoop:string[]; mechanics:string[]; progression:string[]; assetNeeds:string[];
 designPillars?:string[]; implementationPhases?:{name:string;goal:string;systems:string[]}[]; technicalRisks?:string[];
 engine:Exclude<EngineId,"auto">; processing:"local-first"|"hybrid-cloud"; createdAt:string;
};
export type GenerationTaskStatus="queued"|"running"|"completed"|"failed";
export type GenerationTask={id:string;type:string;status:GenerationTaskStatus;input:string;engine:EngineId;result?:GameBlueprint|null;error?:string|null;createdAt:string;updatedAt:string};
export function chooseEngine(engine:EngineId,platform="web"):Exclude<EngineId,"auto">{
 if(engine!=="auto")return engine;
 return platform==="web"?"three":"godot";
}
export function chooseProcessingMode(input:string,aiAvailable:boolean):"local-first"|"hybrid-cloud"{
 const complex=/open world|multiplayer|large scale|procedural|many systems|simulation|massive/i.test(input);
 return aiAvailable&&complex?"hybrid-cloud":"local-first";
}
export function createFallbackBlueprint(prompt:string,engine:EngineId="auto",aiAvailable=false):GameBlueprint{
 const clean=prompt.trim(),lower=clean.toLowerCase();
 const genre=/racing|drift|race/.test(lower)?"Racing":/football|soccer|basketball|sports/.test(lower)?"Sports":/horror|survival/.test(lower)?"Survival":/rpg|fantasy|quest|adventure/.test(lower)?"Adventure":/strategy|kingdom|war/.test(lower)?"Strategy":"Action-adventure";
 const title=clean.replace(/^(make|create|build|design)\s+(me\s+)?/i,"").split(/[.!?]/)[0].trim().slice(0,64)||"Untitled Game";
 return {version:1,title:title.charAt(0).toUpperCase()+title.slice(1),genre,camera:genre==="Racing"?"Third-person chase camera":"Third-person camera",targetPlatform:"Web first · mobile-friendly",summary:"A structured starting blueprint generated from the creator's prompt. It is a plan, not a finished game.",player:{role:"Player-controlled protagonist",goal:"Explore the world, complete objectives and master the core mechanics.",abilities:["Move","Interact","Use the primary game mechanic"]},world:{setting:clean.slice(0,180),environment:["Primary play space","Interactive landmarks","Ambient environment"],regions:["Starting area","Challenge area","Progression area"]},coreLoop:["Explore the world","Discover an objective","Use a gameplay mechanic","Earn progress and unlock the next challenge"],mechanics:["Movement and camera control","Contextual interaction","Objective and checkpoint system","Feedback and progression"],progression:["Introductory objective","Skill-building challenge","Advanced challenge","Completion milestone"],assetNeeds:["Player character","Environment kit","Interactive props","UI and audio feedback"],designPillars:["Clear player goals","Readable world design","Responsive gameplay feedback"],implementationPhases:[{name:"Playable foundation",goal:"Establish movement, camera and one complete objective.",systems:["Player controller","Camera","Objective flow"]},{name:"World expansion",goal:"Add the main spaces and interactive points.",systems:["World blockout","Interactions","NPC or enemy logic"]},{name:"Polish and test",goal:"Tune performance, feedback and progression.",systems:["UI feedback","Audio cues","Playtesting"]}],technicalRisks:["Keep the first playable scope small","Profile performance on target devices"],engine:chooseEngine(engine),processing:chooseProcessingMode(clean,aiAvailable),createdAt:new Date().toISOString()};
}
export function validateBlueprint(value:unknown):string[]{
 if(!value||typeof value!=="object")return ["Blueprint must be an object."];
 const b=value as Partial<GameBlueprint>,errors:string[]=[];
 if(b.version!==1)errors.push("Unsupported blueprint version.");
 if(b.designPillars!==undefined&&(!Array.isArray(b.designPillars)||b.designPillars.some(x=>typeof x!=="string")))errors.push("Design pillars must be a list of text items.");
 if(b.implementationPhases!==undefined&&(!Array.isArray(b.implementationPhases)||b.implementationPhases.some(p=>!p||typeof p.name!=="string"||typeof p.goal!=="string"||!Array.isArray(p.systems))))errors.push("Implementation phases are invalid.");
 if(b.technicalRisks!==undefined&&(!Array.isArray(b.technicalRisks)||b.technicalRisks.some(x=>typeof x!=="string")))errors.push("Technical risks must be a list of text items.");
 if(!b.title?.trim())errors.push("Game title is missing.");
 if(!b.genre?.trim())errors.push("Game genre is missing.");
 if(!b.summary?.trim())errors.push("Game summary is missing.");
 for(const key of ["coreLoop","mechanics","progression","assetNeeds"] as const)if(!Array.isArray(b[key])||!b[key]!.length)errors.push(key+" must contain at least one item.");
 if(!b.player||!b.player.goal)errors.push("Player goal is missing.");
 if(!b.world||!b.world.setting)errors.push("World setting is missing.");
 if(b.engine!=="three"&&b.engine!=="godot")errors.push("Selected engine is not registered.");
 return errors;
}
