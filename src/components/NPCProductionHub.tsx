import { useMemo, useState } from "react";

type NpcTool = {
  name: string;
  category: "Create" | "Rig & animate" | "Character assets" | "Workflow";
  summary: string;
  access: string;
  formats: string;
  url: string;
  note: string;
};

const npcTools: NpcTool[] = [
  { name: "MakeHuman", category: "Create", summary: "Open-source parametric human creator for building base human meshes.", access: "Free · open source", formats: "OBJ / FBX / Blender workflows", url: "https://www.makehumancommunity.org/", note: "Good starting point for realistic human base meshes." },
  { name: "MPFB for Blender", category: "Create", summary: "Create and customise human meshes inside Blender, with rigging and skin/eye materials.", access: "Free · open source", formats: "Blender → GLB / FBX", url: "https://static.makehumancommunity.org/mpfb/index.html", note: "Requires Blender 4.2 or newer for MPFB 2.x." },
  { name: "Blender", category: "Workflow", summary: "Full 3D modelling, sculpting, rigging, animation cleanup and export workspace.", access: "Free · open source", formats: "GLB / glTF / FBX / OBJ", url: "https://www.blender.org/", note: "Best all-round bridge for cleaning and preparing NPC models." },
  { name: "Mixamo", category: "Rig & animate", summary: "Auto-rig humanoid characters and apply a large library of ready-made motion clips.", access: "Free with an Adobe account", formats: "Upload FBX / OBJ / ZIP · download animation files", url: "https://www.mixamo.com/", note: "Humanoid characters only. Check Adobe's current terms before shipping assets." },
  { name: "AccuRIG", category: "Rig & animate", summary: "Free desktop auto-rigging tool for humanoid characters.", access: "Free desktop app", formats: "FBX / USD", url: "https://actorcore.reallusion.com/auto-rig", note: "Desktop workflow; not available as an in-app phone editor." },
  { name: "Mesh2Motion", category: "Rig & animate", summary: "Browser-based auto-rigging and animation for humans and several creature types.", access: "Free · open source", formats: "GLB / GLTF / DAE / FBX in; GLB / FBX out", url: "https://mesh2motion.org/", note: "Strong no-account option for creatures as well as humans; source animations are CC0." },
  { name: "Quaternius", category: "Character assets", summary: "Free game-ready character and animation packs, including modular characters.", access: "Free · CC0 packs available", formats: "GLB / FBX and pack-specific formats", url: "https://quaternius.com/", note: "Check each pack page for its exact format and licence." },
  { name: "VRoid Studio", category: "Create", summary: "Free anime-style 3D character creator with customisable hair, face and clothing.", access: "Free app", formats: "VRM", url: "https://vroid.com/en/studio", note: "VRM needs conversion or a VRM-aware runtime before use in this Three.js project." },
  { name: "AnimStudio", category: "Rig & animate", summary: "Experimental open-source browser studio for rigging, editing animation clips and exporting GLB.", access: "Free · AGPL-3.0", formats: "GLB / FBX animation inputs; GLB export", url: "https://github.com/Sheggyb/AnimStudio", note: "Community project; test exports on a sample character before relying on it." },
  { name: "Open Source Avatars", category: "Character assets", summary: "A curated collection of CC0 avatar models that can seed a varied NPC cast.", access: "Free · CC0 collection", formats: "VRM and source-specific formats", url: "https://github.com/100Avatars/100Avatars", note: "Review the individual collection and model files before importing." },
];

const filters = ["All", "Create", "Rig & animate", "Character assets", "Workflow"] as const;

export default function NPCProductionHub() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("Mesh2Motion");
  const [copied, setCopied] = useState(false);

  const visibleTools = useMemo(() => npcTools.filter(tool =>
    (filter === "All" || tool.category === filter) &&
    (tool.name + " " + tool.summary + " " + tool.formats).toLowerCase().includes(query.toLowerCase())
  ), [filter, query]);

  const selectedTool = npcTools.find(tool => tool.name === selected) ?? npcTools[0];
  const pipeline = selectedTool.name === "VRoid Studio"
    ? "Create your avatar → export VRM → convert or load it with a VRM-aware pipeline → prepare a GLB version for NEXUS BUILD."
    : selectedTool.name === "Quaternius" || selectedTool.name === "Open Source Avatars"
      ? "Choose a character pack → check its licence and file format → download the model → import the GLB/GLTF/FBX file into the NEXUS asset library."
      : selectedTool.name === "Mixamo" || selectedTool.name === "AccuRIG" || selectedTool.name === "Mesh2Motion" || selectedTool.name === "AnimStudio"
        ? "Start with a character mesh → rig it and add motion → export GLB or FBX → import the exported file into the NEXUS asset library."
        : "Create or edit your character → export a game-ready GLB/GLTF (or FBX) → import the exported file into the NEXUS asset library.";

  return <section className="npc-production-hub">
    <div className="npc-production-heading">
      <div>
        <span className="eyebrow">FREE NPC PRODUCTION ECOSYSTEM</span>
        <h2>10 free NPC tools, one workflow</h2>
        <p>Character creation, auto-rigging, animation and ready-made assets. These are companion tools connected through documented workflows — they are not secretly running inside the app.</p>
      </div>
      <span className="npc-production-count">10 TOOLS · $0 ENTRY</span>
    </div>

    <div className="npc-production-controls">
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search NPC tools, formats or jobs…" aria-label="Search NPC tools" />
      <div className="npc-production-filters" role="group" aria-label="Filter NPC tools">
        {filters.map(item => <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
    </div>

    <div className="npc-production-grid">
      {visibleTools.map((tool, index) => <article className={selected === tool.name ? "npc-tool-card selected" : "npc-tool-card"} key={tool.name}>
        <div className="npc-tool-card-top"><span className="npc-tool-number">{String(npcTools.indexOf(tool) + 1).padStart(2, "0")}</span><span className="npc-tool-category">{tool.category}</span></div>
        <h3>{tool.name}</h3>
        <p>{tool.summary}</p>
        <div className="npc-tool-access">{tool.access}</div>
        <div className="npc-tool-formats"><b>Formats</b><span>{tool.formats}</span></div>
        <div className="npc-tool-actions">
          <button type="button" onClick={() => setSelected(tool.name)}>{selected === tool.name ? "Selected" : "Use in workflow"}</button>
          <a href={tool.url} target="_blank" rel="noreferrer">Open tool ↗</a>
        </div>
      </article>)}
      {visibleTools.length === 0 && <div className="npc-tool-empty">No matching tools. Try another search or category.</div>}
    </div>

    <div className="npc-pipeline-card">
      <div className="npc-pipeline-heading"><div><span className="eyebrow">NPC ASSET PIPELINE</span><h3>{selectedTool.name} → NEXUS BUILD</h3></div><span className="npc-pipeline-state">GUIDED WORKFLOW</span></div>
      <p className="npc-pipeline-description">{selectedTool.note}</p>
      <div className="npc-pipeline-steps">
        <span><b>1</b> Create / choose</span><i>→</i><span><b>2</b> Rig / animate</span><i>→</i><span><b>3</b> Export model</span><i>→</i><span><b>4</b> Import asset</span>
      </div>
      <div className="npc-pipeline-instruction">{pipeline}</div>
      <div className="npc-pipeline-footer">
        <span>Recommended interchange format: <b>GLB / GLTF</b></span>
        <button type="button" onClick={() => {
          const text = "NEXUS BUILD NPC import workflow\n" + selectedTool.name + ": " + pipeline + "\nPreferred formats: GLB / GLTF. FBX can be prepared through Blender first.";
          void navigator.clipboard?.writeText(text).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }).catch(() => setCopied(false));
        }}>{copied ? "Copied workflow ✓" : "Copy workflow"}</button>
      </div>
    </div>

    <div className="npc-production-notice">
      <b>Important integration note</b>
      <p>Opening a companion tool does not install it into NEXUS BUILD. After exporting a model, go to <b>Build workspace → Asset library → Import files</b>. The current asset library stores files locally on this device. Direct in-editor import into a scene, automatic skeleton retargeting, VRM conversion and cloud/project-level NPC saving are still future integration tasks.</p>
    </div>
  </section>;
}
