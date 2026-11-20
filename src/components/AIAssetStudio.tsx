import {useEffect,useMemo,useState} from "react";
import {assetApi} from "../api";

type AssetRecord={id:string;name:string;type:string;size:number;updated:number;blob:Blob;prompt?:string;promptKey?:string;source?:string;model?:string};
type Preview={url:string;prompt:string;taskId:string;mimeType:string;model:string;assetType:string;cacheHit:boolean};
const DB_NAME="nexus-build-workspace",STORE="assets";
const MODEL="@cf/black-forest-labs/flux-1-schnell";
function openAssetDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,2);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function saveAsset(asset:AssetRecord){const db=await openAssetDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(asset);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}
function promptKey(prompt:string){return MODEL+":"+prompt.trim().toLowerCase().replace(/\s+/g," ");}
function fileName(prompt:string){const slug=prompt.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"nexus-generated-asset";return slug+".jpg";}
export default function AIAssetStudio({assets,onSaved}:{assets:AssetRecord[];onSaved:()=>void}){
 const[prompt,setPrompt]=useState("A stylised hand-painted stone wall texture for a fantasy village game, seamless surface, no text");
 const[assetType,setAssetType]=useState<"Texture"|"Concept art"|"Sprite">("Texture");
 const[generating,setGenerating]=useState(false),[saving,setSaving]=useState(false),[preview,setPreview]=useState<Preview|null>(null),[status,setStatus]=useState("Describe an image asset to create it with the connected image model.");
 const cacheKey=useMemo(()=>promptKey(prompt),[prompt]);
 useEffect(()=>()=>{if(preview?.url.startsWith("blob:"))URL.revokeObjectURL(preview.url);},[preview?.url]);
 const generate=async()=>{
  if(prompt.trim().length<12){setStatus("Please add a little more detail to the prompt.");return;}
  const cached=assets.find(asset=>asset.promptKey===cacheKey&&asset.blob.type.startsWith("image/"));
  if(cached){const url=URL.createObjectURL(cached.blob);setPreview({url,prompt:cached.prompt??prompt,taskId:"",mimeType:cached.blob.type,model:cached.model??MODEL,assetType:cached.type,cacheHit:true});setStatus("Loaded from this device's intelligent asset cache. No new generation was needed.");return;}
  setGenerating(true);setPreview(null);setStatus("Generating image with Cloudflare Workers AI…");
  try{const result=await assetApi.generateImage(prompt.trim(),assetType);setPreview({url:result.imageDataUrl,prompt:prompt.trim(),taskId:result.taskId,mimeType:result.mimeType,model:result.model,assetType:result.assetType,cacheHit:false});setStatus("Image ready. Save it to add it to this device's asset library.");}
  catch(error){setStatus(error instanceof Error?error.message:"Image generation failed. Check your connection and try again.");}
  finally{setGenerating(false);}
 };
 const save=async()=>{
  if(!preview||preview.cacheHit)return;
  setSaving(true);
  try{
   const blob=await fetch(preview.url).then(response=>{if(!response.ok)throw new Error("Could not read the generated image.");return response.blob();});
   const id=crypto.randomUUID(),key=promptKey(preview.prompt),name=fileName(preview.prompt);
   const record:AssetRecord={id,name,type:preview.assetType,size:blob.size,updated:Date.now(),lastAccessed:Date.now(),pinned:false,blob,prompt:preview.prompt,promptKey:key,source:"workers-ai",model:preview.model};
   await saveAsset(record);
   let catalogueMessage="Saved on this device. ";
   try{await assetApi.register({id,name,assetType:preview.assetType,prompt:preview.prompt,promptKey:key,mimeType:blob.type||preview.mimeType,sizeBytes:blob.size,source:"workers-ai",model:preview.model,license:"Subject to the model provider's current terms"});catalogueMessage+="Metadata indexed in the NEXUS cloud catalogue.";}
   catch(error){catalogueMessage+="Cloud metadata sync is pending: "+(error instanceof Error?error.message:"connection unavailable");}
   setStatus(catalogueMessage);setPreview({...preview,cacheHit:true});onSaved();
  }catch(error){setStatus(error instanceof Error?error.message:"Could not save the generated asset.");}
  finally{setSaving(false);}
 };
 return <section className="ai-asset-studio">
  <div className="ai-asset-heading"><div><span className="eyebrow">HYBRID AI ASSET CREATION</span><b>AI Asset Workshop</b><small>Generate images, textures and sprites. The original file is cached locally; searchable metadata syncs to Cloudflare D1.</small></div><span className="ai-asset-model">FLUX · WORKERS AI</span></div>
  <label className="ai-asset-label">Asset description<textarea rows={3} value={prompt} maxLength={2048} onChange={event=>setPrompt(event.target.value)} placeholder="Describe the image asset you need…"/></label>
  <div className="ai-asset-controls"><label>Asset type<select value={assetType} onChange={event=>setAssetType(event.target.value as typeof assetType)}><option>Texture</option><option>Concept art</option><option>Sprite</option></select></label><button type="button" onClick={()=>void generate()} disabled={generating||saving}>{generating?"Generating…":"✦ Generate asset"}</button></div>
  {preview&&<div className="ai-asset-preview"><img src={preview.url} alt="Generated game asset preview"/><div><b>{preview.cacheHit?"Cached asset":"Generated image ready"}</b><small>{preview.assetType} · {preview.mimeType} · {preview.model}</small>{preview.taskId&&<small>Task {preview.taskId}</small>}{!preview.cacheHit?<button type="button" onClick={()=>void save()} disabled={saving}>{saving?"Saving…":"Save to asset library"}</button>:<span className="ai-asset-cached">Already saved in this device's library</span>}</div></div>}
  <p className="tool-status">{status} Generated images use Workers AI quota. Full image files are stored in this browser's IndexedDB; D1 stores searchable metadata, not the image bytes.</p>
 </section>;
}
