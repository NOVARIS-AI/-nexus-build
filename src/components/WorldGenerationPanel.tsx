import { useState } from "react";
import { createFallbackWorld, type SceneObject, type WorldBiome, type WorldPlan } from "../lib/worldGeneration";
type Props={onGenerate:(objects:SceneObject[],plan:WorldPlan)=>void};
const biomes:{id:WorldBiome;label:string;hint:string}[]=[{id:"city",label:"Modern city",hint:"Roads, buildings, street trees and vehicles"},{id:"village",label:"Village",hint:"Homes, green spaces and community streets"},{id:"fantasy",label:"Fantasy realm",hint:"Mystic towers, ancient landmarks and crystals"},{id:"forest",label:"Forest",hint:"Dense woodland and natural clearings"},{id:"desert",label:"Desert",hint:"Sandstone structures and rocky formations"},{id:"sci-fi",label:"Sci-fi colony",hint:"Futuristic structures and energy beacons"}];
export default function WorldGenerationPanel({onGenerate}:Props){
 const [prompt,setPrompt]=useState("A lively neighbourhood with a central landmark, roads, buildings and green spaces.");
 const [biome,setBiome]=useState<WorldBiome>("city"),[size,setSize]=useState<"compact"|"standard"|"large">("standard");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("AI world generation is ready.");
 const [lastCount,setLastCount]=useState(0);
 const generate=async()=>{
  if(prompt.trim().length<12){setMessage("Describe the world in at least 12 characters.");return;}
  setBusy(true);setMessage("Planning the world layout…");
  try{
   const response=await fetch("/api/world/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:prompt.trim(),biome,size})});
   const data=await response.json();if(!response.ok)throw new Error(data.error??"World generation failed.");
   const plan=data.world;
   if(!plan||!Array.isArray(plan.objects)||!plan.objects.length)throw new Error("The generator returned an empty scene.");
   onGenerate(plan.objects,plan);setLastCount(plan.objects.length);
   setMessage((data.source==="workers-ai"?"AI-generated":"Procedural fallback")+" world ready · "+plan.objects.length+" objects");
  }catch(error){
   const fallback=createFallbackWorld(prompt,biome,size);onGenerate(fallback.objects,fallback);setLastCount(fallback.objects.length);
   setMessage("Local procedural world created · "+fallback.objects.length+" objects. "+(error instanceof Error?error.message:"AI unavailable."));
  }finally{setBusy(false);}
 };
 return <section className="world-generator">
  <div className="world-generator-head"><div><span className="eyebrow">NEXUS WORLD GENERATOR</span><h2>Generate a world, then shape every detail.</h2><p>Describe a place, choose its environment and let the Director lay out a starter scene inside your 3D editor.</p></div><span className="world-gen-mark">✦</span></div>
  <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} aria-label="World description" placeholder="Describe the world you want to create…"/>
  <div className="world-gen-options"><label>ENVIRONMENT<select value={biome} onChange={e=>setBiome(e.target.value as WorldBiome)}>{biomes.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select><small>{biomes.find(b=>b.id===biome)?.hint}</small></label><label>WORLD SIZE<select value={size} onChange={e=>setSize(e.target.value as typeof size)}><option value="compact">Compact</option><option value="standard">Standard</option><option value="large">Large</option></select><small>Controls the spread of the generated layout</small></label><button className="build-btn" disabled={busy||prompt.trim().length<12} onClick={generate}>{busy?"Generating…":"✦ Generate 3D world"}</button></div>
  <div className="world-gen-status"><span className={busy?"pulse":"good"}/>{message}{lastCount>0&&<b>{lastCount} OBJECTS</b>}</div>
 </section>;
}
