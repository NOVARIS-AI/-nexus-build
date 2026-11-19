export type SceneKind="building"|"tree"|"road"|"car"|"cube"|"sphere"|"cylinder"|"cone"|"torus"|"plane";
export type SceneObject={id:string;name:string;kind:SceneKind;position:[number,number,number];rotation:[number,number,number];scale:[number,number,number];color:string};
export type WorldBiome="city"|"village"|"fantasy"|"forest"|"desert"|"sci-fi";
export type WorldPlan={version:1;name:string;biome:WorldBiome;description:string;objects:SceneObject[];spawnPoint:[number,number,number];lighting:"day"|"sunset"|"night";generatedAt:string};
const colors:Record<WorldBiome,string[]>={city:["#b77b5b","#d3a66d","#738b9c","#8d6f65"],village:["#b78d63","#d7b879","#8b9d72"],fantasy:["#8d77b8","#b58cce","#667f9b"],forest:["#547b58","#8b9d62","#78634b"],desert:["#d8a65f","#b97848","#d9c18b"],"sci-fi":["#547e9b","#7967a8","#5a9d9b"]};
const green:Record<WorldBiome,string>={city:"#477c58",village:"#5f9159",fantasy:"#5d865d",forest:"#39734e",desert:"#b78c55","sci-fi":"#477c78"};
const object=(id:string,name:string,kind:SceneKind,position:[number,number,number],scale:[number,number,number],color:string,rotation:[number,number,number]=[0,0,0]):SceneObject=>({id,name,kind,position,rotation,scale,color});
export function createFallbackWorld(prompt:string,biome:WorldBiome="city",size:"compact"|"standard"|"large"="standard"):WorldPlan{
 const factor=size==="compact"?.72:size==="large"?1.45:1,objects:SceneObject[]=[],palette=colors[biome],greenColor=green[biome];
 const add=(v:SceneObject)=>objects.push(v);
 add(object("world-road-north","North avenue","road",[0,-.045,-3],[12*factor,.12,1.5], "#343d49"));
 add(object("world-road-south","South avenue","road",[0,-.045,4],[12*factor,.12,1.5], "#343d49"));
 add(object("world-road-west","West crossing","road",[-5,-.04,.5],[1.5,.12,15*factor],"#343d49"));
 add(object("world-road-east","East crossing","road",[5,-.04,.5],[1.5,.12,15*factor],"#343d49"));
 const rows=[-8,-6.2,7,9],xs=[-8,-5,-2,2,5,8];let n=0;
 for(const z of rows)for(const x of xs){if(Math.abs(x)<3&&Math.abs(z)<6)continue;const h=1.5+((n*7)%4)*.48;add(object("world-building-"+n,biome==="village"?"Village home "+(n+1):biome==="fantasy"?"Fantasy tower "+(n+1):"Building "+(n+1),"building",[x*factor,h/2,z*factor],[1.25*factor,h,1.25*factor],palette[n%palette.length]));n++;}
 for(let i=0;i<14;i++){const x=((i*11)%19-9)*factor,z=((i*7)%23-11)*factor;if(Math.abs(x)<4&&Math.abs(z)<5)continue;add(object("world-tree-"+i,"Tree "+(i+1),"tree",[x,.85,z],[.75+((i%3)*.12),1, .75+((i%3)*.12)],greenColor));}
 if(biome==="city"||biome==="village"){for(let i=0;i<3;i++)add(object("world-vehicle-"+i,"Street vehicle "+(i+1),"car",[-3+i*3,.35,1.8],[.7,.35,1.2],["#c65c4e","#d4a64f","#628ba4"][i],[0,i*.12,0]));}
 if(biome==="fantasy"){add(object("world-crystal-1","Ancient crystal","cone",[0,1.1,0],[1.1,2.2,1.1],"#8d7be1"));add(object("world-portal","Portal monument","torus",[0,1.6,-1],[1.5,1.5,.3],"#70c9d5",[Math.PI/2,0,0]));}
 if(biome==="sci-fi"){for(let i=0;i<4;i++)add(object("world-beacon-"+i,"Energy beacon "+(i+1),"cylinder",[-7+i*4,.8,0],[.25,1.6,.25],"#64c9d5"));}
 if(biome==="desert"){for(let i=0;i<7;i++)add(object("world-rock-"+i,"Rock formation "+(i+1),"sphere",[-9+(i*3%18),.35,-9+(i*7%18)],[.8,.45,.65],"#bd9564"));}
 add(object("world-landmark","Central landmark","building",[0,1.2,-1],[2.1,2.4,2.1],palette[0]));
 return {version:1,name:(prompt.trim().slice(0,48)||"Generated world"),biome,description:prompt.trim().slice(0,500),objects,spawnPoint:[0,.6,1],lighting:biome==="sci-fi"?"night":biome==="fantasy"?"sunset":"day",generatedAt:new Date().toISOString()};
}
export function validateWorldPlan(value:unknown):string[]{
 if(!value||typeof value!=="object")return ["World plan must be an object."];
 const p=value as Partial<WorldPlan>,errors:string[]=[];
 if(p.version!==1)errors.push("Unsupported world plan version.");
 if(!p.name?.trim())errors.push("World name is missing.");
 if(!Array.isArray(p.objects)||p.objects.length<1||p.objects.length>120)errors.push("World must contain between 1 and 120 objects.");
 if(p.biome&&!["city","village","fantasy","forest","desert","sci-fi"].includes(p.biome))errors.push("Unknown biome.");
 return errors;
}
export function sanitizeWorldObjects(input:unknown):SceneObject[]{
 if(!Array.isArray(input))return [];
 const kinds:SceneKind[]=["building","tree","road","car","cube","sphere","cylinder","cone","torus","plane"];
 return input.slice(0,120).flatMap((raw,index)=>{
  if(!raw||typeof raw!=="object")return [];
  const v=raw as Record<string,unknown>,kind=kinds.includes(v.kind as SceneKind)?v.kind as SceneKind:null;
  const tuple=(value:unknown,fallback:[number,number,number],min:number,max:number):[number,number,number]=>{
   if(!Array.isArray(value)||value.length!==3)return fallback;
   return value.map((n,i)=>typeof n==="number"&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback[i]) as [number,number,number];
  };
  const color=typeof v.color==="string"&&/^#[0-9a-fA-F]{6}$/.test(v.color)?v.color:"#9a83bd";
  if(!kind)return [];
  return [{id:"world-"+index,name:typeof v.name==="string"?v.name.slice(0,60):"World object "+(index+1),kind,position:tuple(v.position,[0,.5,0],-40,40),rotation:tuple(v.rotation,[0,0,0],-6.3,6.3),scale:tuple(v.scale,[1,1,1],.05,30),color}];
 });
}
