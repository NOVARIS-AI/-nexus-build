import { useEffect, useRef, useState } from "react";

export default function NPCLibrary(){
 const host=useRef<HTMLDivElement>(null);
 const [status,setStatus]=useState("Loading real 3D character…");
 useEffect(()=>{
  let cancelled=false;
  const mount=()=>{
   if(cancelled||!host.current)return;
   const character=document.createElement("ara-character");
   character.setAttribute("preset","The Female Executive");
   character.setAttribute("animation","idle, look_around, talk_gestures");
   character.setAttribute("expression","happy");
   character.setAttribute("detail","high");
   character.setAttribute("background","#24232c");
   character.setAttribute("auto-rotate","");
   character.setAttribute("zoom","");
   character.style.width="100%";
   character.style.height="100%";
   character.addEventListener("load",()=>setStatus("REAL 3D MODEL · RIGGED · ANIMATED"),{once:true});
   character.addEventListener("error",()=>setStatus("3D model could not load · check your connection"),{once:true});
   host.current.replaceChildren(character);
  };
  let script=document.querySelector<HTMLScriptElement>('script[data-ara-embed="true"]');
  if(customElements.get("ara-character")) mount();
  else if(script){script.addEventListener("load",mount,{once:true});}
  else{
   script=document.createElement("script");script.type="module";script.src="https://cdn.jsdelivr.net/npm/ara3d@0/dist/embed.js";script.dataset.araEmbed="true";script.addEventListener("load",mount,{once:true});script.addEventListener("error",()=>setStatus("Could not load the 3D character engine"),{once:true});document.head.appendChild(script);
  }
  return()=>{cancelled=true;if(host.current)host.current.replaceChildren();};
 },[]);
 return <section className="npc-library">
  <div className="npc-library-head"><div><div className="eyebrow">CHARACTER ASSET LIBRARY</div><h2>NPC Library</h2><p>Real, reusable 3D characters for game projects. Developers choose which NPCs to add; nothing is placed automatically.</p></div><span className="npc-library-count">LIVE 3D CHARACTER PREVIEW</span></div>
  <div className="npc-library-grid">
   <article className="npc-asset-card">
    <div className="npc-asset-preview"><div className="npc-preview-label">INTERACTIVE 3D VIEWPORT</div><div className="npc-preview-stage" ref={host}/><span className="npc-preview-hint">{status} · Drag to rotate · Pinch/scroll to zoom</span></div>
    <div className="npc-asset-info"><div className="npc-asset-title"><div><h3>Amara · City Administrator</h3><p>Human NPC · public services and city scenes</p></div><span className="npc-asset-tag">LIBRARY SAMPLE</span></div>
     <div className="npc-asset-tags"><span>Real human mesh</span><span>Rigged skeleton</span><span>Animated</span><span>High detail</span></div>
     <p className="npc-asset-description">A real 3D human character generated from the Ara character system, with a full rig, facial features and animation support. This is an interactive model preview, not a flat picture or primitive-shape mannequin.</p>
     <div className="npc-asset-meta"><span>MODEL <b>Ara 3D · CC0 character data</b></span><span>PREVIEW <b>Live 3D</b></span></div>
     <a className="npc-open-builder" href="https://ara3dgen.com/app/" target="_blank" rel="noreferrer">Customise this character in the 3D builder ↗</a>
    </div>
   </article>
   <div className="npc-library-note"><div className="npc-note-icon">✦</div><b>1,000+ NPC library target</b><p>This is one real rigged 3D character preview. The larger library will grow through reusable presets, custom character variations, outfits, roles and animation sets. We will not label the catalogue as 1,000 assets until those assets actually exist.</p><div className="npc-note-stats"><span><b>1</b> live 3D sample</span><span><b>1,000+</b> target catalogue</span></div>
   </div>
  </div>
 </section>;
}
