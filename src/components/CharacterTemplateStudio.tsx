import { useMemo, useRef, useState } from "react";
import { npcApi } from "../api";

type CharacterProfile = {
  id: string;
  name: string;
  role: string;
  appearance?: {
    characterFamily?: string;
    species?: string;
    visualStyle?: string;
    assetStatus?: string;
    characterDesign?: Record<string, unknown>;
  };
};

type DesignDraft = {
  name: string;
  characterFamily: string;
  species: string;
  visualStyle: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  silhouetteNotes: string;
  detailNotes: string;
  referenceImage?: string;
  referenceName?: string;
};

const families = [
  ["humanoid", "Humanoid"], ["animal", "Animal"], ["creature", "Creature / Monster"], ["fantasy", "Fantasy Species"],
  ["robot", "Robot / Android"], ["anthropomorphic", "Anthropomorphic"], ["alien", "Alien / Hybrid"],
] as const;
const styles = [
  ["anime", "Anime"], ["realistic-3d", "Realistic 3D"], ["cartoon", "Cartoon"],
  ["stylized-3d", "Stylized 3D"], ["pixel-art", "Pixel Art"],
] as const;
const defaultDraft = (npc: CharacterProfile): DesignDraft => {
  const saved = npc.appearance?.characterDesign ?? {};
  const read = (key: keyof DesignDraft, fallback: string) =>
    typeof saved[key] === "string" ? String(saved[key]) : fallback;
  return {
    name: read("name", npc.name),
    characterFamily: read("characterFamily", npc.appearance?.characterFamily ?? "humanoid"),
    species: read("species", npc.appearance?.species ?? "Human"),
    visualStyle: read("visualStyle", npc.appearance?.visualStyle ?? "stylized-3d"),
    primaryColor: read("primaryColor", "#8a9a74"),
    secondaryColor: read("secondaryColor", "#d6c5a5"),
    accentColor: read("accentColor", "#d58b52"),
    silhouetteNotes: read("silhouetteNotes", "Distinctive readable silhouette with clear proportions."),
    detailNotes: read("detailNotes", "Original character design. Keep shapes and materials easy to customise."),
    referenceImage: read("referenceImage", ""),
    referenceName: read("referenceName", ""),
  };
};

export default function CharacterTemplateStudio({ selectedNpc }: { selectedNpc: CharacterProfile }) {
  const key = "nexus-build-character-design:" + selectedNpc.id;
  const initial = useMemo(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? { ...defaultDraft(selectedNpc), ...JSON.parse(saved) as Partial<DesignDraft> } : defaultDraft(selectedNpc);
    } catch { return defaultDraft(selectedNpc); }
  }, [key, selectedNpc]);
  const [draft, setDraft] = useState<DesignDraft>(initial);
  const [message, setMessage] = useState("Customise this original character template. A reference image guides your design; it is not copied automatically.");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const update = (field: keyof DesignDraft, value: string) => setDraft(current => ({ ...current, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      localStorage.setItem(key, JSON.stringify(draft));
      if (selectedNpc.id.startsWith("local-character-")) {
        setMessage("Design saved on this device. This scratch character has not been added to the shared catalogue.");
      } else {
        try {
          const { referenceImage: _referenceImage, ...shareableDesign } = draft;
          await npcApi.saveDesign(selectedNpc.id, shareableDesign as unknown as Record<string, unknown>);
          setMessage("Design saved on this device and synced to the character catalogue.");
        } catch {
          setMessage("Design saved on this device. Cloud sync is unavailable until the catalogue accepts your signed-in session.");
        }
      }
    } catch {
      setMessage("Could not save locally. Remove the reference image if browser storage is full.");
    } finally { setSaving(false); }
  };

  const exportDesign = () => {
    const blob = new Blob([JSON.stringify({ format: "nexus-build-character-design", version: 1, design: draft }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = (draft.name.trim() || "character-design").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Character design pack exported.");
  };

  const importDesign = (file?: File) => {
    if (!file) return;
    void file.text().then(raw => {
      const parsed = JSON.parse(raw) as { format?: string; version?: number; design?: Partial<DesignDraft> };
      if (parsed.format !== "nexus-build-character-design" || parsed.version !== 1 || !parsed.design) throw new Error("Unsupported character design pack.");
      setDraft(current => ({ ...current, ...parsed.design }));
      setMessage("Design pack imported. Review it, then save.");
    }).catch(error => setMessage(error instanceof Error ? error.message : "Could not import this design pack."));
  };

  const attachReference = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Choose an image file for the visual reference."); return; }
    if (file.size > 1500000) { setMessage("Reference images must be 1.5 MB or smaller for local storage."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft(current => ({ ...current, referenceImage: reader.result as string, referenceName: file.name }));
        setMessage("Reference attached locally. Use it to guide an original design.");
      }
    };
    reader.onerror = () => setMessage("Could not read that reference image.");
    reader.readAsDataURL(file);
  };

  const familyLabel = families.find(([value]) => value === draft.characterFamily)?.[1] ?? "Custom character";
  return <section className="npc-library" style={{ display: "grid", gap: 18 }}>
    <div className="npc-library-head">
      <div><div className="eyebrow">EXISTING NPC REDESIGN WORKSHOP</div><h2>{draft.name || selectedNpc.name}</h2><p>{familyLabel} · {draft.species} · Reusable visual design template</p></div>
      <span className="npc-library-count">EXISTING NPC · {selectedNpc.id}</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
      <article className="npc-asset-card" style={{ minWidth: 0 }}>
        <div style={{ minHeight: 260, display: "grid", placeItems: "center", padding: 24, background: "radial-gradient(circle at 50% 35%, #ffffff20, transparent 65%), #20232d", color: "white", borderRadius: 14 }}>
          {draft.referenceImage ? <img src={draft.referenceImage} alt="User-provided visual reference" style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 10 }} /> :
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 76, lineHeight: 1.2 }}>{draft.characterFamily === "robot" ? "🤖" : draft.characterFamily === "animal" ? "🦊" : draft.characterFamily === "creature" ? "🐉" : draft.characterFamily === "fantasy" ? "🧝" : draft.characterFamily === "alien" ? "👽" : "🐾"}</div><b>{draft.species}</b><p style={{ opacity: .7, margin: "8px 0 0" }}>Design preview placeholder · {draft.visualStyle}</p></div>}
        </div>
        <div className="npc-asset-info"><b>Visual reference & design direction</b><p>{draft.referenceName || "No reference image attached."} References guide an original design and do not create a finished model by themselves.</p><button type="button" onClick={() => fileRef.current?.click()}>＋ Upload reference image</button><input ref={fileRef} hidden type="file" accept="image/*" onChange={event => attachReference(event.target.files?.[0])}/>{draft.referenceImage && <button type="button" className="npc-text-button" onClick={() => setDraft(current => ({ ...current, referenceImage: "", referenceName: "" }))}>Remove reference</button>}</div>
      </article>
      <aside className="npc-editor-panel">
        <div className="npc-editor-title"><div><span className="eyebrow">CHARACTER CONFIGURATION</span><h3>Appearance controls</h3></div><span className="npc-live-pill">EDITABLE</span></div>
        <label className="npc-field">Character name<input value={draft.name} onChange={event => update("name", event.target.value)} maxLength={80}/></label>
        <label className="npc-field">Character family<select value={draft.characterFamily} onChange={event => update("characterFamily", event.target.value)}>{families.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="npc-field">Species / archetype<input value={draft.species} onChange={event => update("species", event.target.value)} maxLength={80}/></label>
        <label className="npc-field">Visual style<select value={draft.visualStyle} onChange={event => update("visualStyle", event.target.value)}>{styles.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="npc-colour-group"><b>Material and palette direction</b><div className="npc-colour-row"><label>Primary<input type="color" value={draft.primaryColor} onChange={event => update("primaryColor", event.target.value)}/></label><label>Secondary<input type="color" value={draft.secondaryColor} onChange={event => update("secondaryColor", event.target.value)}/></label><label>Accent<input type="color" value={draft.accentColor} onChange={event => update("accentColor", event.target.value)}/></label></div></div>
        <label className="npc-field">Silhouette & proportions<textarea rows={3} value={draft.silhouetteNotes} onChange={event => update("silhouetteNotes", event.target.value)} maxLength={1200}/></label>
        <label className="npc-field">Materials, features & accessories<textarea rows={3} value={draft.detailNotes} onChange={event => update("detailNotes", event.target.value)} maxLength={1600}/></label>
        <div className="npc-editor-actions"><button type="button" className="npc-apply-button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save character design"}</button><button type="button" className="npc-reset-button" onClick={exportDesign}>Export JSON pack</button><button type="button" className="npc-reset-button" onClick={() => importFileRef.current?.click()}>Import JSON pack</button><input ref={importFileRef} hidden type="file" accept="application/json,.json" onChange={event => importDesign(event.target.files?.[0])}/></div>
        <p className="npc-editor-message" role="status">{message}</p>
      </aside>
    </div>
    <div className="npc-library-note npc-library-note-wide"><div className="npc-note-icon">✦</div><b>Stage 1 · Redesign an existing NPC</b><p>Saving updates this NPC record in place. It does not create another NPC or duplicate the catalogue entry. This stage stores the approved appearance brief and design controls; finished sprites, 3D models and animation come in later stages.</p></div>
  </section>;
}
