import { useMemo, useRef, useState } from "react";
import * as HumanForgeWeb from "humanforge/web";
import type { HumanConfig } from "humanforge/human";
const HumanCanvas = (HumanForgeWeb as unknown as { HumanCanvas: React.ComponentType<any> }).HumanCanvas;
const HumanEditor = HumanForgeWeb.HumanEditor;
const useHumanPackage = HumanForgeWeb.useHumanPackage;
import { npcApi } from "../api";

const HUMAN_ASSETS = "https://cdn.jsdelivr.net/gh/abdulrehman043/humanforge@v0.5.0/assets/human";
const SAVE_PREFIX = "nexus-build-humanforge-character-v2";

type SavedCharacter = Partial<HumanConfig> | { config: Partial<HumanConfig>; savedAt?: string };

type SelectedNpc = {
  id: string;
  name: string;
  role: string;
  personality?: string;
  routine?: string;
  appearance?: {
    description?: string;
    humanConfig?: Partial<HumanConfig>;
    dailySchedule?: string;
    behaviourNotes?: string;
  };
} | null;

function storageKey(npc?: SelectedNpc) {
  return SAVE_PREFIX + ":" + (npc?.id ?? "default");
}

function readSavedConfig(npc?: SelectedNpc): SavedCharacter | undefined {
  try {
    const value = localStorage.getItem(storageKey(npc));
    return value ? JSON.parse(value) as SavedCharacter : undefined;
  } catch {
    return undefined;
  }
}

function inferHumanConfig(npc?: SelectedNpc): Partial<HumanConfig> {
  const description = (npc?.appearance?.description ?? "").toLowerCase();
  const role = (npc?.role ?? "").toLowerCase();
  const female = /\b(woman|female|girl|lady|mother|nurse|teacher)\b/.test(description + " " + role);
  const male = /\b(man|male|boy|gentleman|father)\b/.test(description + " " + role);
  const gender = female ? 0 : male ? 1 : 0.5;
  const hair = /afro|natural hair|coily/.test(description) ? "afro01"
    : /braid|plait/.test(description) ? "braid01"
    : /ponytail/.test(description) ? "ponytail01"
    : /long hair|long straight/.test(description) ? "long01"
    : male ? "short02" : "short01";
  const hairColor = /grey|gray|silver/.test(description) ? "#a8a39c"
    : /blonde|blond/.test(description) ? "#e6c88a"
    : /auburn|ginger|copper|red hair/.test(description) ? "#8e3b1f"
    : /brown hair|brown-haired/.test(description) ? "#6b4428" : "#1a1412";
  const skin = /ebony|very dark|deep dark/.test(description) ? "young_african_female"
    : /light skin|fair skin/.test(description) ? "young_caucasian_female"
    : "young_african_female";
  const outfit = /uniform|nurse|doctor|medical/.test(description + " " + role)
    ? (female ? "female_elegantsuit01" : "male_worksuit01")
    : /suit|formal|executive|office/.test(description)
      ? (female ? "female_elegantsuit01" : "male_elegantsuit01")
      : (female ? "female_casualsuit01" : "male_casualsuit01");
  const color = /white coat|lab coat/.test(description) ? "#e9e2d6"
    : /red|burgundy/.test(description) ? "#7c2945"
    : /blue|navy/.test(description) ? "#1f3a5f"
    : /green/.test(description) ? "#1e6b45" : "#315b50";
  return {
    gender,
    hair,
    hairColor,
    skin,
    clothes: [outfit, "shoes01"],
    garmentColors: { outfit: color },
  };
}

export default function HumanForgeStudio({ selectedNpc }: { selectedNpc?: SelectedNpc }) {
  const [attempt, setAttempt] = useState(0);
  return <HumanForgeLoader key={`${attempt}-${selectedNpc?.id ?? "default"}`} selectedNpc={selectedNpc} onRetry={() => setAttempt(value => value + 1)} />;
}

function HumanForgeLoader({ onRetry, selectedNpc }: { onRetry: () => void; selectedNpc?: SelectedNpc }) {
  const { pkg, error } = useHumanPackage(HUMAN_ASSETS, { textureFormat: "webp" });
  const [saved, setSaved] = useState(() => !!readSavedConfig(selectedNpc));
  const [currentConfig, setCurrentConfig] = useState<HumanConfig | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const exportAvatar = useRef<any>(null);
  const [characterName, setCharacterName] = useState(selectedNpc?.name ?? "Amara");
  const [message, setMessage] = useState("Your edits stay in this character's editor until you save them.");
  const inferredConfig = useMemo(() => inferHumanConfig(selectedNpc), [selectedNpc?.id, selectedNpc?.appearance?.description]);
  const stored = readSavedConfig(selectedNpc);
  const storedConfig = stored && "config" in stored ? stored.config : stored;
  const initialConfig = storedConfig ?? selectedNpc?.appearance?.humanConfig ?? inferredConfig;
  const activeConfig = currentConfig ?? (initialConfig as HumanConfig);

  const saveCharacter = async (config: HumanConfig, _snapshot: string | null) => {
    try {
      localStorage.setItem(storageKey(selectedNpc), JSON.stringify({ config, savedAt: new Date().toISOString() }));
      setSaved(true);
      setMessage("Saved on this device. Syncing to the NEXUS database…");
      if (selectedNpc?.id) {
        try {
          await npcApi.saveCharacter(selectedNpc.id, config as Record<string, unknown>);
          setMessage("This NPC's 3D configuration is saved locally and synced to the NEXUS database.");
        } catch (error) {
          setMessage(error instanceof Error ? "Saved locally; database sync failed: " + error.message : "Saved locally; database sync failed.");
        }
      }
    } catch {
      setMessage("This browser could not save the character. Check available device storage and try again.");
    }
  };

  const exportCharacter = async () => {
    const avatar = exportAvatar.current;
    if (!avatar) { setExportMessage("The 3D model is still preparing. Wait a moment and try again."); return; }
    setExporting(true);
    setExportMessage("Building your GLB model…");
    try {
      const { exportHumanGLB } = await import("humanforge/human/export");
      const bytes = await exportHumanGLB(avatar);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(characterName.trim() || selectedNpc?.name || "nexus-character").replace(/[^a-z0-9-_]+/gi, "-")}.glb`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMessage("GLB export created. Check your device downloads.");
    } catch (exportError) {
      setExportMessage(exportError instanceof Error ? `GLB export failed: ${exportError.message}` : "GLB export failed. Please try again.");
    } finally { setExporting(false); }
  };

  if (error) {
    return <div className="nexus-humanforge-state">
      <b>Character creator could not load</b>
      <p>{error.message}</p>
      <small>Check your internet connection. The creator assets are hosted separately from the app.</small>
      <button type="button" className="nexus-humanforge-retry" onClick={onRetry}>Try loading again</button>
    </div>;
  }

  if (!pkg) {
    return <div className="nexus-humanforge-state" role="status">
      <span className="npc-loading-orb" />
      <b>Preparing the realistic 3D character creator…</b>
      <p>The shared character engine loads once. Character textures and clothing are fetched only when selected.</p>
      <small>First load needs internet. On a phone, this may take a little while.</small>
    </div>;
  }

  return <div className="nexus-humanforge">
    <div className="nexus-humanforge-heading">
      <div>
        <span className="eyebrow">IN-APP HUMAN CREATOR</span>
        <h3>{selectedNpc ? `Customising ${selectedNpc.name}` : "Realistic Character Workshop"}</h3>
        <p>AI appearance brief is translated into a real HumanForge 3D starting configuration. Edit skin, eyes, face, hair, clothing and accessories below.</p>
      </div>
      <span className="npc-live-pill">HUMANFORGE · CC0 ASSETS</span>
    </div>
    {selectedNpc && <div className="nexus-selected-npc"><div><span className="eyebrow">GENERATED NPC</span><b>{selectedNpc.role}</b><small>{selectedNpc.personality ?? "Resident"} · {selectedNpc.routine ?? "daily routine"}</small></div><label>Custom NPC name<input value={characterName} onChange={event => setCharacterName(event.target.value)} maxLength={48} placeholder="Enter a character name"/></label></div>}
    {selectedNpc?.appearance?.description && <div className="nexus-humanforge-note"><b>AI appearance brief</b><p>{selectedNpc.appearance.description}</p></div>}
    <div className="nexus-humanforge-editor">
      <HumanEditor
        key={selectedNpc?.id ?? "sample"}
        pkg={pkg}
        defaultValue={initialConfig}
        options={{
          sections: ["face", "skin", "eyes", "brows", "nose", "mouth", "hair", "headwear", "outfit", "shoes"],
          exclude: ["body"],
          detailRange: 0.5,
          colors: {
            hair: ["#171311", "#302019", "#563a2b", "#80583b", "#b78b60", "#d7bd91"],
            eyebrows: ["#171311", "#302019", "#563a2b", "#80583b"],
            garments: ["#202b3a", "#5b263b", "#8b6749", "#d5b98c", "#315b50", "#6c6388", "#e7e0d5"]
          },
        }}
        onChange={setCurrentConfig}
        onSave={saveCharacter}
        saveLabel={selectedNpc ? "Save this NPC's 3D character" : "Save character on this device"}
        randomize={false}
        accentColor="#b58c67"
        background="#d7d2cc"
        style={{ height: "650px", minHeight: "650px" }}
      />
    </div>
    <section className="nexus-humanforge-export">
      <div><b>Export real 3D model</b><p>Generate a portable GLB containing the character mesh, rig, blendshapes and textures.</p></div>
      <div className="nexus-humanforge-export-preview"><HumanCanvas pkg={pkg} config={activeConfig} framing="body" background="#d7d2cc" textureSize="1k" onReady={(avatar) => { exportAvatar.current = avatar; }} style={{ height: "300px", width: "100%" }} /></div>
      <button type="button" className="nexus-humanforge-export-button" onClick={exportCharacter} disabled={exporting}>{exporting ? "Exporting…" : "Export character as .GLB"}</button>
      {exportMessage && <small role="status">{exportMessage}</small>}
    </section>
    <div className="nexus-humanforge-footer">
      <span>{saved ? "A saved HumanForge configuration exists for this character on this device." : "AI starting appearance loaded; save after any edits."}</span>
      <span>{message}</span>
      {selectedNpc && <span>Current display name: <b>{characterName.trim() || selectedNpc.name}</b>.</span>}
    </div>
    <p className="nexus-humanforge-note">HumanForge generates the actual rigged 3D human mesh from its CC0 assets. AI chooses a starting look from the available engine options; fine details can be edited here. The character configuration syncs to Cloudflare D1; export the generated rigged model as GLB using the exporter above.</p>
  </div>;
}
