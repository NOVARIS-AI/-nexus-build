import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const starterPrompts = ["Build a lively Lagos street with danfo buses and market stalls","Create a fantasy island with a village, forest and hidden temple","Make a neon racing game with checkpoints and drifting"];

function WorldPreview() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#11141b");
    scene.fog = new THREE.Fog("#11141b", 18, 48);
    const camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
    camera.position.set(10, 9, 13);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.current.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xb9d7ff, 0x29301f, 2));
    const sun = new THREE.DirectionalLight(0xffd5a1, 3);
    sun.position.set(7, 12, 5); sun.castShadow = true; scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({color:"#263c35",roughness:1}));
    ground.rotation.x = -Math.PI/2; ground.position.y = -.16; ground.receiveShadow = true; scene.add(ground);
    const grid = new THREE.GridHelper(40, 40, "#51675d", "#34483f"); grid.position.y = -.14; scene.add(grid);
    const mat = (color:string) => new THREE.MeshStandardMaterial({color,roughness:.8});
    const addBox = (x:number,y:number,z:number,w:number,h:number,d:number,color:string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color)); m.position.set(x,y+h/2,z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
    };
    // Procedural blockout: buildings, roads and trees, intentionally editable placeholder geometry.
    addBox(0,.02,0,1.8,.12,13,"#333b43"); addBox(0,.03,0,13,.12,1.8,"#333b43");
    for(let i=0;i<5;i++){ addBox(-5+i*2.4,0,-4,1.45,1.8+(i%3)*.8,1.5,["#b76e4d","#d5a35d","#647f91"][i%3]); addBox(-5+i*2.4,0,4,1.45,1.4+(i%2)*1.1,1.5,"#a96e59"); }
    for(let i=0;i<7;i++){ const x=-7+(i%4)*4.6, z=-7+Math.floor(i/4)*13; addBox(x,0,z,.35,1.5,.35,"#75543a"); const crown=new THREE.Mesh(new THREE.ConeGeometry(.9,2.2,7),mat("#3f805c")); crown.position.set(x,2.2,z); crown.castShadow=true; scene.add(crown); }
    const car = addBox(1,.2,1,.8,.38,1.45,"#e7a34e"); car.rotation.y=-.3;
    const resize=()=>{ if(!host.current)return; const w=host.current.clientWidth,h=host.current.clientHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); };
    resize(); const observer=new ResizeObserver(resize); observer.observe(host.current);
    let frame=0; let active=true;
    const animate=()=>{ if(!active)return; frame=requestAnimationFrame(animate); car.rotation.y=-.3+Math.sin(Date.now()*.0005)*.08; renderer.render(scene,camera); }; animate();
    return ()=>{active=false;cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();host.current?.removeChild(renderer.domElement);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose(); const m=o.material; if(Array.isArray(m))m.forEach(v=>v.dispose());else m.dispose();}});};
  },[]);
  return <div className="world" ref={host}><div className="world-tag"><span className="live-dot"/> LIVE BLOCKOUT PREVIEW</div><div className="world-hint">Drag controls coming next · Procedural scene</div></div>;
}

export default function App(){
  const [prompt,setPrompt]=useState(""); const [tab,setTab]=useState("World"); const [built,setBuilt]=useState(false);
  const build=()=>{if(prompt.trim()){setBuilt(true);}};
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">N</div><div><b>NEXUS</b><small>BUILD STUDIO</small></div></div>
      <div className="workspace-label">WORKSPACE</div><button className="nav active">◈ <span>Game Studio</span></button><button className="nav">▦ <span>My Projects</span></button><button className="nav">◇ <span>Asset Library</span></button><button className="nav">⌘ <span>AI Director</span></button>
      <div className="side-bottom"><div className="plan"><span className="plan-icon">✦</span><div><b>Community Preview</b><small>Local-first foundation</small></div></div><div className="profile"><div className="avatar">N</div><div><b>Nexus Creator</b><small>Personal workspace</small></div><span>···</span></div></div>
    </aside>
    <section className="main"><header className="topbar"><div><span className="crumb">Workspace</span><span className="slash">/</span><b>Untitled World</b></div><div className="top-actions"><span className="saved"><i/> All changes saved</span><button className="ghost">Share</button><button className="publish" onClick={()=>setBuilt(true)}>▶ Play preview</button></div></header>
      <div className="content"><div className="heading"><div><div className="eyebrow">YOUR NEXT WORLD STARTS HERE</div><h1>Imagine it. <em>Build it.</em></h1><p>Describe a game idea and shape it into a playable world.</p></div><div className="version">EARLY ACCESS <b>0.1.0</b></div></div>
        <section className="director"><div className="director-head"><div className="spark">✦</div><div><b>AI Game Director</b><small>Turn a natural-language idea into a game plan</small></div><span className="model">PROMPT ENGINE · FOUNDATION</span></div>
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the game you want to create... e.g. A third-person adventure through a lively Lagos neighbourhood with traffic, shops and quests."/>
          <div className="prompt-foot"><span>Be as imaginative as you like.</span><button className="build-btn" onClick={build} disabled={!prompt.trim()}>✦ Generate game plan <span>↗</span></button></div>
          <div className="suggestions">{starterPrompts.map(p=><button key={p} onClick={()=>setPrompt(p)}>{p} <span>↗</span></button>)}</div>
          {built&&<div className="notice"><b>Idea captured.</b> Your prompt is ready for the next AI-planning stage. The current preview is a procedural 3D blockout; full AI asset generation and game export are not connected yet.</div>}
        </section>
        <div className="section-row"><div><h2>World editor</h2><p>Explore your scene foundation</p></div><div className="editor-tabs">{["World","Assets","Logic"].map(t=><button className={tab===t?"selected":""} key={t} onClick={()=>setTab(t)}>{t}</button>)}</div></div>
        <div className="editor"><div className="viewport"><WorldPreview/></div><aside className="inspector"><div className="inspector-title">SCENE HIERARCHY <span>＋</span></div><div className="tree selected-tree">⌄ ◫ <b>{tab==="World"?"World Scene":tab==="Assets"?"Asset Library":"Game Logic"}</b></div>{(tab==="World"?["▧ Environment","▧ Buildings (10)","♧ Trees (7)","▰ Roads","◇ Lighting"]:tab==="Assets"?["◇ Primitive meshes","▧ Materials","♧ Nature pack","▱ Buildings pack"]:["⚡ Player controller","◎ Interaction system","◈ Mission system"]).map(x=><div className="tree-item" key={x}>{x}</div>)}<div className="inspector-title properties">INSPECTOR</div><div className="property"><small>OBJECT</small><b>{tab==="World"?"World Scene":tab==="Assets"?"Asset Library":"Game Logic"}</b></div><div className="property"><small>STATUS</small><span className="status">● Prototype scene</span></div><div className="property"><small>ENGINE</small><b>Three.js · Web preview</b></div><div className="property"><small>NEXT MILESTONE</small><span>Editable transforms & scene saving</span></div></aside></div>
        <div className="roadmap"><div><span className="road-icon">01</span><div><b>Prompt → Game plan</b><small>Prompt capture foundation</small></div><span className="state done">FOUNDATION</span></div><div><span className="road-icon">02</span><div><b>World & asset pipeline</b><small>Procedural geometry preview</small></div><span className="state">IN PROGRESS</span></div><div><span className="road-icon">03</span><div><b>Playable game runtime</b><small>Godot integration planned</small></div><span className="state">PLANNED</span></div></div>
      </div>
    </section>
  </main>;
}
