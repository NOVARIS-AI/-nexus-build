import {useEffect,useRef,useState} from "react";
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

type PreviewAsset={id:string;name:string;type:string;blob:Blob;size:number};
export default function AssetPreview({asset}:{asset:PreviewAsset|null}){
 const host=useRef<HTMLDivElement>(null),[url,setUrl]=useState(""),[text,setText]=useState(""),[status,setStatus]=useState("");
 useEffect(()=>{if(!asset){setUrl("");setText("");return;}const next=URL.createObjectURL(asset.blob);setUrl(next);return()=>URL.revokeObjectURL(next);},[asset?.id,asset?.blob]);
 useEffect(()=>{let active=true;if(asset?.type==="Code"){asset.blob.text().then(value=>{if(active)setText(value.slice(0,12000));}).catch(()=>setText("Text preview unavailable."));}else setText("");return()=>{active=false;};},[asset?.id,asset?.blob,asset?.type]);
 useEffect(()=>{
  if(!asset||asset.type!=="3D model"||!asset.name.toLowerCase().endsWith(".glb")||!host.current)return;
  const target=host.current,scene=new THREE.Scene();scene.background=new THREE.Color("#151a20");
  const camera=new THREE.PerspectiveCamera(42,1,.01,1000);camera.position.set(3,2.5,4);camera.lookAt(0,0,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));target.replaceChildren(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x47515e,2));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(4,6,5);scene.add(key);
  let model:THREE.Object3D|null=null,frame=0,active=true;const resize=()=>{const w=target.clientWidth,h=Math.max(target.clientHeight,180);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const observer=new ResizeObserver(resize);observer.observe(target);
  const loader=new GLTFLoader();asset.blob.arrayBuffer().then(buffer=>{if(!active)return;loader.parse(buffer,"",gltf=>{if(!active)return;model=gltf.scene;const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());model.position.sub(center);scene.add(model);const max=Math.max(size.x,size.y,size.z)||1;camera.position.set(max*1.8,max*1.25,max*1.8);camera.lookAt(0,0,0);setStatus("Interactive GLB preview");},error=>{if(active)setStatus(error instanceof Error?error.message:"Could not parse this GLB file.");});}).catch(()=>{if(active)setStatus("Could not read this model file.");});
  const animate=()=>{if(!active)return;frame=requestAnimationFrame(animate);if(model)model.rotation.y+=.003;renderer.render(scene,camera);};animate();
  return()=>{active=false;cancelAnimationFrame(frame);observer.disconnect();if(model)model.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose());}});renderer.dispose();target.replaceChildren();};
 },[asset?.id,asset?.blob,asset?.type,asset?.name]);
 if(!asset)return null;
 const isImage=asset.blob.type.startsWith("image/")||["Texture","Concept art","Sprite"].includes(asset.type);
 return <section className="asset-preview-panel"><div className="asset-preview-head"><b>Asset preview</b><span>{asset.name} · {(asset.size/1024/1024).toFixed(2)} MB</span></div>{isImage&&url?<img className="asset-preview-image" src={url} alt={asset.name}/>:asset.type==="Audio"&&url?<audio className="asset-preview-audio" controls preload="metadata" src={url}/>:asset.type==="3D model"&&asset.name.toLowerCase().endsWith(".glb")?<><div ref={host} className="asset-preview-model"/><small className="asset-preview-note">{status||"Loading interactive model preview…"}</small></>:asset.type==="Code"?<pre className="asset-preview-code">{text||"Loading text preview…"}</pre>:<div className="asset-preview-unavailable">Preview is not available for this format yet. You can still export the original file.</div>}</section>;
}
