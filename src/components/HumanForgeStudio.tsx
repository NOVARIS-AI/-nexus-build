import { useState } from "react";
import { HumanEditor, useHumanPackage } from "humanforge/web";
import type { HumanConfig } from "humanforge/human";

const HUMAN_ASSETS = "https://cdn.jsdelivr.net/gh/abdulrehman043/humanforge@v0.5.0/assets/human";
const SAVE_KEY = "nexus-build-character-studio-v1";

type SavedCharacter = Partial<HumanConfig> | { config: Partial<HumanConfig>; savedAt?: string };

function readSavedConfig(): SavedCharacter | undefined {
  try {
    const value = localStorage.getItem(SAVE_KEY);
    return value ? JSON.parse(value) as SavedCharacter : undefined;
  } catch {
    return undefined;
  }
}

export default function HumanForgeStudio({ selectedNpc }: { selectedNpc?: { id: string; name: string; role: string; personality?: string; routine?: string } | null }) {
  const [attempt, setAttempt] = useState(0);
  return <HumanForgeLoader key={`${attempt}-${selectedNpc?.id ?? "default"}`} selectedNpc={selectedNpc} onRetry={() => setAttempt((value) => value + 1)} />;
}

function HumanForgeLoader({ onRetry, selectedNpc }: { onRetry: () => void; selectedNpc?: { id: string; name: string; role: string; personality?: string; routine?: string } | null }) {
  const { pkg, error } = useHumanPackage(HUMAN_ASSETS, { textureFormat: "webp" });
  const [saved, setSaved] = useState(() => !!readSavedConfig());
  const [characterName, setCharacterName] = useState(selectedNpc?.name ?? "Amara");
  const [message, setMessage] = useState("Your edits stay in the editor until you save them.");

  const saveCharacter = (config: HumanConfig, _snapshot: string | null) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ config, savedAt: new Date().toISOString() }));
      setSaved(true);
      setMessage("Character settings saved on this device. You can reopen this editor and continue editing.");
    } catch {
      setMessage("This browser could not save the character. Check available device storage and try again.");
    }
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

  const stored = readSavedConfig();
  const initialConfig = stored && "config" in stored ? stored.config as Partial<HumanConfig> : stored;

  return <div className="nexus-humanforge">
    <div className="nexus-humanforge-heading">
      <div>
        <span className="eyebrow">IN-APP HUMAN CREATOR</span>
        <h3>{selectedNpc ? `Customising ${selectedNpc.name}` : "Realistic Character Workshop"}</h3>
        <p>Skin tone, eye colour, face details, hair, clothing and accessories — edited directly beside the 3D preview.</p>
      </div>
      <span className="npc-live-pill">HUMANFORGE · CC0 ASSETS</span>
    </div>
    {selectedNpc && <div className="nexus-selected-npc"><div><span className="eyebrow">SELECTED LIBRARY NPC</span><b>{selectedNpc.role}</b><small>{selectedNpc.personality ?? "Resident"} · {selectedNpc.routine ?? "daily routine"}</small></div><label>Custom NPC name<input value={characterName} onChange={event => setCharacterName(event.target.value)} maxLength={48} placeholder="Enter a character name"/></label></div>}
    <div className="nexus-humanforge-editor">
      <HumanEditor
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
        onSave={saveCharacter}
        saveLabel="Save character on this device"
        randomize={false}
        accentColor="#b58c67"
        background="#d7d2cc"
        style={{ height: "650px", minHeight: "650px" }}
      />
    </div>
    <div className="nexus-humanforge-footer">
      <span>{saved ? "A saved character configuration exists on this device." : "No saved character configuration yet."}</span>
      <span>{message}</span>{selectedNpc && <span>Current custom name: <b>{characterName.trim() || selectedNpc.name}</b>. This is the NPC display name; the 3D model settings are edited below.</span>}
    </div>
    <p className="nexus-humanforge-note">The 3D creator and its CC0 character assets are loaded from the HumanForge public CDN. The saved settings currently stay in this browser on this device; project-wide NPC asset saving and GLB export are separate next steps.</p>
  </div>;
}
