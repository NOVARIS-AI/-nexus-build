import { useState } from "react";
import { projectApi, type Project } from "../api";
import { ENGINE_REGISTRY, createFallbackBlueprint, validateBlueprint, type EngineId, type GameBlueprint, type GenerationTask } from "../lib/nexusCore";

type Props={onProjectCreated:(project:Project)=>void};
export default function CoreFoundationStudio({onProjectCreated}:Props){
 const [prompt,setPrompt]=useState("");
 const [refinement,setRefinement]=useState("");
 const [engine,setEngine]=useState<EngineId>("auto");
 const [blueprint,setBlueprint]=useState<GameBlueprint|null>(null);
 const [task,setTask]=useState<GenerationTask|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("Describe a game to create its structured blueprint.");
 const [saving,setSaving]=useState(false);
 const errors=blueprint?validateBlueprint(blueprint):[];
 const generate=async(refine=false)=>{
  const instruction=refinement.trim();
  if(prompt.trim().length<12){setMessage("Add a little more detail (at least 12 characters).");return;}
  if(refine&&(!blueprint||instruction.length<8)){setMessage("Describe what you want changed in at least 8 characters.");return;}
  setBusy(true);setMessage(refine?"AI Director is refining your existing game plan…":"Creating generation task…");if(!refine)setBlueprint(null);
  let current:GenerationTask|null=null;
  try{
   const created=await fetch("/api/tasks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:refine?"game-blueprint-refinement":"game-blueprint",input:refine?instruction:prompt.trim(),engine})});
   const createdData=await created.json();if(!created.ok)throw new Error(createdData.error??"Could not create generation task.");
   current=createdData.task as GenerationTask;setTask(current);
   await fetch("/api/tasks/"+encodeURIComponent(current.id),{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"running"})});
   setMessage("AI Director is structuring your game idea…");
   const response=await fetch("/api/director/plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:prompt.trim(),engine,...(refine?{refinement:instruction,existingBlueprint:blueprint}:{})})});
   const data=await response.json();if(!response.ok)throw new Error(data.error??"Blueprint generation failed.");
   const plan=data.blueprint as GameBlueprint;const problems=validateBlueprint(plan);if(problems.length)throw new Error(problems.join(" "));
   setBlueprint(plan);const done={...current,status:"completed" as const,result:plan,updatedAt:new Date().toISOString()};setTask(done);
   await fetch("/api/tasks/"+encodeURIComponent(current.id),{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"completed",result:plan})});
   setRefinement("");setMessage((refine?"Blueprint refined · ":"")+(data.source==="workers-ai"?"AI-generated":"Local fallback")+" blueprint ready · "+plan.engine+" engine");
  }catch(error){
   const reason=error instanceof Error?error.message:"Unexpected generation error.";
   if(current){const failed={...current,status:"failed" as const,error:reason};setTask(failed);await fetch("/api/tasks/"+encodeURIComponent(current.id),{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"failed",error:reason})}).catch(()=>{});}
   setMessage(reason);
  }finally{setBusy(false);}
 };
 const save=async()=>{
  if(!blueprint||errors.length)return;setSaving(true);
  try{const project=await projectApi.create({name:blueprint.title.slice(0,100),description:blueprint.summary,prompt,scene_json:JSON.stringify({version:1,objects:[],gameplay:{},blueprint})});onProjectCreated(project);setMessage("Blueprint saved as a project. Open World Editor to begin building the scene.");}
  catch(error){setMessage(error instanceof Error?error.message:"Could not save project.");}
  finally{setSaving(false);}
 };
 const exportJson=()=>{if(!blueprint)return;const url=URL.createObjectURL(new Blob([JSON.stringify(blueprint,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="nexus-game-blueprint.json";a.click();URL.revokeObjectURL(url);};
 return <section className="core-studio">
  <div className="core-hero"><div><span className="eyebrow">NEXUS CORE FOUNDATION</span><h2>From idea to a buildable game plan.</h2><p>The AI Director converts your description into a structured blueprint, validates it and records the generation task.</p></div><span className="core-version">CORE · 0.2</span></div>
  <div className="core-prompt"><label htmlFor="nexus-game-prompt">DESCRIBE YOUR GAME</label><textarea id="nexus-game-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Example: Build an open-world Lagos adventure with danfo traffic, markets, missions, shops and NPCs with daily routines."/><div className="core-prompt-foot"><select aria-label="Target engine" value={engine} onChange={e=>setEngine(e.target.value as EngineId)}><option value="auto">Adaptive engine selection</option><option value="three">Three.js browser runtime</option><option value="godot">Godot export target (planned)</option></select><button className="build-btn" onClick={generate} disabled={busy||prompt.trim().length<12}>{busy?"Building plan…":"✦ Generate blueprint ↗"}</button></div></div>
  <div className="core-status"><span className={busy?"pulse":task?.status==="completed"?"good":"idle"}/>{message}</div>
  <div className="core-grid"><article className="core-panel"><div className="core-panel-head"><b>Engine registry</b><small>Capability-aware runtime selection</small></div>{ENGINE_REGISTRY.map(item=><div className="engine-row" key={item.id}><div><b>{item.name}</b><small>{item.role}</small><p>{item.notes}</p></div><span className={item.status==="active"?"engine-live":"engine-planned"}>{item.status}</span></div>)}</article>
   <article className="core-panel"><div className="core-panel-head"><b>Core services</b><small>Foundation systems</small></div>{[["Project blueprint","Versioned, portable JSON schema"],["Generation task manager","Queued, running, completed and failed states"],["Hybrid processing","Local-first with optional Cloudflare AI"],["Validation","Schema and required-field checks"],["Asset foundation","Local asset library with import/export"]].map(([a,b])=><div className="service-row" key={a}><span>✓</span><div><b>{a}</b><small>{b}</small></div></div>)}</article></div>
  {task&&<div className="core-task"><div><span className="eyebrow">LATEST GENERATION TASK</span><b>{task.type}</b><small>{task.id} · {task.status.toUpperCase()}</small></div><span className={"task-state "+task.status}>{task.status}</span></div>}
  {blueprint&&<div className="core-refinement"><div><b>Refine this game plan</b><small>Ask the AI Director to adjust mechanics, world design, progression, scope or another part of the existing blueprint.</small></div><textarea value={refinement} onChange={e=>setRefinement(e.target.value)} rows={2} maxLength={800} placeholder="Example: Make the traffic system more realistic and add delivery missions…"/><button className="build-btn" onClick={()=>void generate(true)} disabled={busy||refinement.trim().length<8}>{busy?"Refining…":"✦ Refine existing blueprint"}</button></div>}
  {blueprint&&<div className="core-blueprint"><div className="core-panel-head"><div><b>{blueprint.title}</b><small>{blueprint.genre} · {blueprint.camera} · {blueprint.engine}</small></div><div className="core-actions"><button className="ghost" onClick={exportJson}>Export JSON</button><button className="build-btn" onClick={save} disabled={saving||errors.length>0}>{saving?"Saving…":"Save as project"}</button></div></div><p>{blueprint.summary}</p><div className="blueprint-columns"><div><b>Core gameplay loop</b>{blueprint.coreLoop.map((v,i)=><p key={i}>{i+1}. {v}</p>)}</div><div><b>Mechanics</b>{blueprint.mechanics.map(v=><p key={v}>• {v}</p>)}</div><div><b>World & assets</b><p>{blueprint.world.setting}</p><p>{blueprint.world.regions.join(" · ")}</p><p>{blueprint.assetNeeds.join(" · ")}</p></div></div><div className="blueprint-validation"><span>{errors.length?"Validation needs attention":"✓ Blueprint validation passed"}</span><small>{errors.length?errors.join(" · "):"Ready to save and continue in World Editor."}</small></div></div>}
 </section>;
}
