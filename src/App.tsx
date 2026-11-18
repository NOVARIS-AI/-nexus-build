import { useState } from "react";
import ProjectManager from "./components/ProjectManager";
import SceneEditor from "./components/SceneEditor";

const starterPrompts = ["Build a lively Lagos street with danfo buses and market stalls","Create a fantasy island with a village, forest and hidden temple","Make a neon racing game with checkpoints and drifting"];

export default function App(){
  const [prompt,setPrompt]=useState(""); const [built,setBuilt]=useState(false);
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
          {built&&<div className="notice"><b>Idea captured.</b> Your prompt is ready for the next AI-planning stage. The current editor provides procedural 3D blockout geometry and interactive object transforms; AI asset generation and game export are not connected yet.</div>}
          <ProjectManager prompt={prompt} onLoadPrompt={setPrompt} />
        </section>
        <div className="section-row"><div><h2>World editor</h2><p>Select objects and shape your scene in real time</p></div><span className="version">SCENE EDITOR · PROTOTYPE</span></div>
        <SceneEditor/>
        <div className="roadmap"><div><span className="road-icon">01</span><div><b>Prompt → Game plan</b><small>Prompt capture foundation</small></div><span className="state done">FOUNDATION</span></div><div><span className="road-icon">02</span><div><b>World & asset pipeline</b><small>Interactive procedural scene editor</small></div><span className="state">IN PROGRESS</span></div><div><span className="road-icon">03</span><div><b>Playable game runtime</b><small>Godot integration planned</small></div><span className="state">PLANNED</span></div></div>
      </div>
    </section>
  </main>;
}
