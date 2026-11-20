import { useState } from "react";
import ProjectManager from "./components/ProjectManager";
import SceneEditor from "./components/SceneEditor";
import ToolchainStudio from "./components/ToolchainStudio";
import TwoDStudio from "./components/TwoDStudio";
import GameplayStudio from "./components/GameplayStudio";
import CoreFoundationStudio from "./components/CoreFoundationStudio";
import NPCLibrary from "./components/NPCLibrary";
import PopulationLibrary from "./components/PopulationLibrary";
import PageErrorBoundary from "./components/PageErrorBoundary";
import type { Project } from "./api";
import type { PopulationNpc } from "./lib/npcPopulation";

type Page = "home" | "director" | "projects" | "world" | "npcs" | "library" | "gameplay" | "tools" | "2d";

const navigation: { id: Page; label: string; icon: string; group: string }[] = [
  { id: "home", label: "Overview", icon: "⌂", group: "WORKSPACE" },
  { id: "director", label: "AI Director", icon: "✦", group: "WORKSPACE" },
  { id: "projects", label: "My Projects", icon: "▦", group: "WORKSPACE" },
  { id: "world", label: "World Editor", icon: "◇", group: "CREATE" },
  { id: "npcs", label: "NPC Studio", icon: "♙", group: "CREATE" },
  { id: "library", label: "NPC Library", icon: "▤", group: "CREATE" },
  { id: "gameplay", label: "Gameplay", icon: "▶", group: "CREATE" },
  { id: "tools", label: "Toolchain", icon: "⌘", group: "CREATE" },
  { id: "2d", label: "2D Studio", icon: "▧", group: "CREATE" },
];

const pageMeta: Record<Page, { title: string; subtitle: string; eyebrow: string }> = {
  home: { title: "Your creative workspace", subtitle: "Pick up where you left off and jump into any part of your game.", eyebrow: "NEXUS BUILD STUDIO" },
  director: { title: "AI Game Director", subtitle: "Describe the experience you want to create and shape its game plan.", eyebrow: "IDEA TO GAME PLAN" },
  projects: { title: "Your projects", subtitle: "Create, reopen and manage your saved game projects.", eyebrow: "PROJECT WORKSPACE" },
  world: { title: "World Editor", subtitle: "Build your environment, place objects and shape the world in 3D.", eyebrow: "SCENE DESIGN" },
  npcs: { title: "NPC Studio", subtitle: "Create, customise and import reusable characters for your game worlds.", eyebrow: "CHARACTER WORKSHOP" },
  library: { title: "NPC Library", subtitle: "Browse the full resident index, search by name or role, and filter the catalogue by category.", eyebrow: "CHARACTER INDEX" },
  gameplay: { title: "Gameplay Lab", subtitle: "Playtest your world, tune missions and manage resident behaviour.", eyebrow: "RUNTIME & SIMULATION" },
  tools: { title: "Production Toolchain", subtitle: "Manage assets, scripts, visual logic and connected creator tools.", eyebrow: "CREATOR UTILITIES" },
  "2d": { title: "2D Game Studio", subtitle: "Design a 2D scene, arrange game objects and test a simple playable prototype.", eyebrow: "2D GAME CREATION" },
};

const starterPrompts = [
  "Build a lively Lagos street with danfo buses and market stalls",
  "Create a fantasy island with a village, forest and hidden temple",
  "Make a neon racing game with checkpoints and drifting",
];

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [prompt, setPrompt] = useState("");
  const [built, setBuilt] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<PopulationNpc | null>(null);
  const build = () => { if (prompt.trim()) setBuilt(true); };
  const meta = pageMeta[page];

  const renderPage = () => {
    if (page === "home") {
      return <div className="dashboard-grid">
        <button className="dashboard-feature" onClick={() => setPage("director")}><span className="dashboard-feature-icon">✦</span><span><b>Start with an idea</b><small>Open the AI Game Director and plan your next game.</small></span><i>↗</i></button>
        <button className="dashboard-feature" onClick={() => setPage("world")}><span className="dashboard-feature-icon">◇</span><span><b>Build a world</b><small>Open the 3D editor and shape your scene.</small></span><i>↗</i></button>
        <button className="dashboard-feature" onClick={() => setPage("npcs")}><span className="dashboard-feature-icon">♙</span><span><b>Create characters</b><small>Design and organise NPCs for your worlds.</small></span><i>↗</i></button>
        <button className="dashboard-feature" onClick={() => setPage("gameplay")}><span className="dashboard-feature-icon">▶</span><span><b>Test your game</b><small>Launch the runtime and try your world.</small></span><i>↗</i></button>
        <div className="dashboard-status"><div><span className="eyebrow">CURRENT WORKSPACE</span><b>{currentProject?.name || "No project selected"}</b><small>{currentProject ? "Your selected project is ready to edit." : "Open My Projects to create or select a project."}</small></div><button className="build-btn" onClick={() => setPage("projects")}>Open projects ↗</button></div>
        <div className="roadmap"><div><span className="road-icon">01</span><div><b>Prompt → Game plan</b><small>Prompt capture foundation</small></div><span className="state done">FOUNDATION</span></div><div><span className="road-icon">02</span><div><b>World & asset pipeline</b><small>Interactive procedural scene editor</small></div><span className="state">IN PROGRESS</span></div><div><span className="road-icon">03</span><div><b>Playable game runtime</b><small>Godot integration planned</small></div><span className="state">PLANNED</span></div></div>
      </div>;
    }
    if (page === "director") return <CoreFoundationStudio onProjectCreated={setCurrentProject}/>;
    if (page === "projects") return <ProjectManager prompt={prompt} onLoadPrompt={value => { setPrompt(value); setPage("director"); }} onSelectProject={setCurrentProject}/>;
    if (page === "world") return <SceneEditor project={currentProject} onProjectUpdated={setCurrentProject}/>;
    if (page === "npcs") return <NPCLibrary selectedNpc={selectedNpc} onBack={() => setPage("library")}/>;
    if (page === "library") return <PopulationLibrary onPreview={npc => { setSelectedNpc(npc); setPage("npcs"); }}/>;
    if (page === "gameplay") return <GameplayStudio project={currentProject} onProjectUpdated={setCurrentProject}/>;
    if (page === "2d") return <TwoDStudio project={currentProject}/>;
    return <ToolchainStudio project={currentProject}/>;
  };

  return <main className="shell">
    <aside className="sidebar">
      <button className="brand brand-button" onClick={() => setPage("home")} aria-label="Nexus Build home"><div className="brand-mark">N</div><div><b>NEXUS</b><small>BUILD STUDIO</small></div></button>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">
        {navigation.map(item => <button key={item.id} className={`nav ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)} aria-current={page === item.id ? "page" : undefined}><span className="nav-icon">{item.icon}</span><span>{item.label}</span></button>)}
      </nav>
      <div className="side-bottom"><div className="plan"><span className="plan-icon">✦</span><div><b>Community Preview</b><small>Local-first foundation</small></div></div><div className="profile"><div className="avatar">N</div><div><b>Nexus Creator</b><small>Personal workspace</small></div><span>···</span></div></div>
    </aside>
    <section className="main">
      <header className="topbar"><div className="breadcrumb"><span className="crumb">Nexus Build</span><span className="slash">/</span><b>{meta.title}</b></div><div className="top-actions"><span className="saved"><i/> Workspace ready</span>{currentProject && <span className="current-project-chip">{currentProject.name}</span>}<button className="publish" onClick={() => setPage("gameplay")}>▶ Playtest</button></div></header>
      <div className="content page-content">
        <div className="page-heading"><div><div className="eyebrow">{meta.eyebrow}</div><h1>{meta.title}</h1><p>{meta.subtitle}</p></div><div className="version">EARLY ACCESS <b>0.1.0</b></div></div>
        <PageErrorBoundary key={page}>{renderPage()}</PageErrorBoundary>
      </div>
    </section>
  </main>;
}