import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { projectApi, type Project } from "../api";

type SceneObject = {
  id: string;
  name: string;
  kind: "building" | "tree" | "road" | "car" | "cube";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
};

const initialObjects: SceneObject[] = [
  { id: "road-main", name: "Main Road", kind: "road", position: [0, -0.05, 0], rotation: [0, 0, 0], scale: [1.8, 0.12, 13], color: "#333b43" },
  { id: "road-cross", name: "Cross Road", kind: "road", position: [0, -0.04, 0], rotation: [0, 0, 0], scale: [13, 0.12, 1.8], color: "#333b43" },
  ...Array.from({ length: 5 }, (_, i): SceneObject => ({ id: `building-${i+1}`, name: `Building ${i+1}`, kind: "building", position: [-5+i*2.4, 0.9+(i%3)*0.4, -4], rotation: [0, 0, 0], scale: [1.45, 1.8+(i%3)*.8, 1.5], color: ["#b76e4d","#d5a35d","#647f91"][i%3] })),
  ...Array.from({ length: 5 }, (_, i): SceneObject => ({ id: `building-south-${i+1}`, name: `South Building ${i+1}`, kind: "building", position: [-5+i*2.4, .7+(i%2)*.55, 4], rotation: [0, 0, 0], scale: [1.45, 1.4+(i%2)*1.1, 1.5], color: "#a96e59" })),
  ...Array.from({ length: 7 }, (_, i): SceneObject => ({ id: `tree-${i+1}`, name: `Tree ${i+1}`, kind: "tree", position: [-7+(i%4)*4.6, 1.1, -7+Math.floor(i/4)*13], rotation: [0, 0, 0], scale: [1, 1, 1], color: "#3f805c" })),
  { id: "car-1", name: "Vehicle", kind: "car", position: [1, .39, 1], rotation: [0, -.3, 0], scale: [.8, .38, 1.45], color: "#e7a34e" }
];

function makeMesh(item: SceneObject) {
  const material = new THREE.MeshStandardMaterial({ color: item.color, roughness: .8 });
  const geometry = item.kind === "tree" ? new THREE.ConeGeometry(.9, 2.2, 7) : new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...item.position);
  mesh.rotation.set(...item.rotation);
  mesh.scale.set(...item.scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.objectId = item.id;
  return mesh;
}

type Props = { project: Project | null; onProjectUpdated: (project: Project) => void };

export default function SceneEditor({ project, onProjectUpdated }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshMap = useRef(new Map<string, THREE.Mesh>());
  const [objects, setObjects] = useState<SceneObject[]>(initialObjects);
  const [selectedId, setSelectedId] = useState("car-1");
  const [mode, setMode] = useState<"move" | "rotate" | "scale">("move");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const selected = objects.find(o => o.id === selectedId) ?? null;

  useEffect(() => {
    if (!project) { setObjects(initialObjects); setSelectedId("car-1"); return; }
    try {
      const saved = JSON.parse(project.scene_json || "{}") as SceneObject[] | { objects?: SceneObject[] };
      const restored = Array.isArray(saved) ? saved : saved.objects;
      if (restored && Array.isArray(restored) && restored.length) {
        setObjects(restored);
        setSelectedId(restored.some(item => item.id === "car-1") ? "car-1" : restored[0].id);
      } else {
        setObjects(initialObjects);
        setSelectedId("car-1");
      }
      setSaveMessage("");
    } catch {
      setObjects(initialObjects);
      setSelectedId("car-1");
      setSaveMessage("Saved scene data could not be read; showing the starter scene.");
    }
  }, [project?.id]);
  
  const saveScene = async () => {
    if (!project || saving) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const updated = await projectApi.update(project.id, { scene_json: JSON.stringify(objects) });
      onProjectUpdated(updated);
      setSaveMessage("Scene saved to this project.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not save scene.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!host.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#11141b");
    scene.fog = new THREE.Fog("#11141b", 18, 48);
    const camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
    camera.position.set(10, 9, 13);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    sceneRef.current = scene;
    scene.add(new THREE.HemisphereLight(0xb9d7ff, 0x29301f, 2));
    const sun = new THREE.DirectionalLight(0xffd5a1, 3);
    sun.position.set(7, 12, 5); sun.castShadow = true; scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: "#263c35", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.16; ground.receiveShadow = true; scene.add(ground);
    const grid = new THREE.GridHelper(40, 40, "#51675d", "#34483f"); grid.position.y = -.14; scene.add(grid);
    const resize = () => {
      if (!host.current) return;
      const w = host.current.clientWidth, h = host.current.clientHeight;
      camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(host.current);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...meshMap.current.values()], false);
      if (hits.length) setSelectedId(hits[0].object.userData.objectId as string);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    let frame = 0, active = true;
    const animate = () => { if (!active) return; frame = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();
    return () => {
      active = false; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.dispose();
      scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const m = o.material; if (Array.isArray(m)) m.forEach(v => v.dispose()); else m.dispose(); } });
      host.current?.removeChild(renderer.domElement);
      meshMap.current.clear(); sceneRef.current = null; rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const current = new Set(objects.map(o => o.id));
    for (const [id, mesh] of meshMap.current) {
      if (!current.has(id)) { scene.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); meshMap.current.delete(id); }
    }
    for (const item of objects) {
      let mesh = meshMap.current.get(item.id);
      if (!mesh) { mesh = makeMesh(item); meshMap.current.set(item.id, mesh); scene.add(mesh); }
      mesh.position.set(...item.position);
      mesh.rotation.set(...item.rotation);
      mesh.scale.set(...item.scale);
      (mesh.material as THREE.MeshStandardMaterial).color.set(item.id === selectedId ? "#f1c18b" : item.color);
    }
  }, [objects, selectedId]);

  const update = (key: "position" | "rotation" | "scale", axis: 0 | 1 | 2, value: number) => {
    if (!selected) return;
    setObjects(items => items.map(item => item.id !== selected.id ? item : { ...item, [key]: item[key].map((v, i) => i === axis ? value : v) as [number, number, number] }));
  };
  const addCube = () => {
    const id = `cube-${Date.now()}`;
    setObjects(items => [...items, { id, name: `Cube ${items.filter(x => x.kind === "cube").length + 1}`, kind: "cube", position: [0, .5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: "#9a83bd" }]);
    setSelectedId(id);
  };
  const removeSelected = () => {
    if (!selected || selected.kind === "road") return;
    setObjects(items => items.filter(item => item.id !== selected.id));
    setSelectedId("car-1");
  };
  const fields = mode === "move" ? ["position", "position", "position"] as const : mode === "rotate" ? ["rotation", "rotation", "rotation"] as const : ["scale", "scale", "scale"] as const;
  const labels = mode === "move" ? ["X", "Y", "Z"] : mode === "rotate" ? ["X", "Y", "Z"] : ["Width", "Height", "Depth"];
  const values = selected ? selected[fields[0]] : [0, 0, 0];
  const ranges = mode === "move" ? [-12, 12, .1] : mode === "rotate" ? [-3.14, 3.14, .05] : [.1, 5, .1];

  return <div className="scene-editor">
    <div className="scene-viewport">
      <div className="world" ref={host}>
        <div className="world-tag"><span className="live-dot"/> INTERACTIVE 3D SCENE</div>
        <div className="world-hint">Tap an object to select it · Changes update in the viewport</div>
      </div>
      <div className="scene-toolbar">
        <button className={mode === "move" ? "tool-active" : ""} onClick={() => setMode("move")}>↔ Move</button>
        <button className={mode === "rotate" ? "tool-active" : ""} onClick={() => setMode("rotate")}>⟳ Rotate</button>
        <button className={mode === "scale" ? "tool-active" : ""} onClick={() => setMode("scale")}>⤢ Scale</button>
        <button onClick={addCube}>＋ Add cube</button>\n        <button onClick={() => void saveScene()} disabled={!project || saving}>{saving ? "Saving…" : "Save scene"}</button>
      </div>
    </div>
    <aside className="scene-inspector">
      <div className="inspector-title">SCENE HIERARCHY <span>{objects.length} OBJECTS</span></div>
      <div className="object-list">{objects.map(item => <button key={item.id} className={item.id === selectedId ? "object-row object-selected" : "object-row"} onClick={() => setSelectedId(item.id)}><span>{item.kind === "tree" ? "♧" : item.kind === "building" ? "▧" : item.kind === "road" ? "▰" : "◇"}</span>{item.name}</button>)}</div>
      <div className="inspector-title properties">INSPECTOR</div>
      {selected ? <>
        <div className="selected-object"><small>SELECTED OBJECT</small><b>{selected.name}</b><span>{selected.kind.toUpperCase()}</span></div>
        <div className="transform-tabs">{(["move", "rotate", "scale"] as const).map(m => <button key={m} className={mode === m ? "transform-active" : ""} onClick={() => setMode(m)}>{m}</button>)}</div>
        {labels.map((label, axis) => <label className="transform-control" key={label}><span>{label}</span><input type="number" step={ranges[2]} min={ranges[0]} max={ranges[1]} value={Number(values[axis].toFixed(2))} onChange={e => update(fields[axis], axis as 0|1|2, Number(e.target.value))}/></label>)}
        <button className="delete-object" onClick={removeSelected} disabled={selected.kind === "road"}>Remove selected object</button>
      </> : <div className="empty-inspector">Select an object in the scene or hierarchy.</div>}
      <div className="editor-footnote">{project ? `Editing: ${project.name}` : "Save a project above to enable cloud scene saving."} {saveMessage && <span className="scene-save-message">{saveMessage}</span>}</div>
    </aside>
  </div>;
}
