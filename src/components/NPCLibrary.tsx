import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function NPCLibrary(){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#20232a");
  const camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(3.1,2.2,4.8);camera.lookAt(0,1,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;el.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xe8f0ff,0x51433b,2));
  const key=new THREE.DirectionalLight(0xffd5a8,3);key.position.set(3,6,4);key.castShadow=true;scene.add(key);
  const fill=new THREE.PointLight(0x9bafe8,1.2);fill.position.set(-3,2,1);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2.1,48),new THREE.MeshStandardMaterial({color:"#34343d",roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.035;floor.receiveShadow=true;scene.add(floor);
  const bodyMat=new THREE.MeshStandardMaterial({color:"#bd8054",roughness:.8}),cloth=new THREE.MeshStandardMaterial({color:"#d7a64f",roughness:.9}),dark=new THREE.MeshStandardMaterial({color:"#292b35",roughness:.9}),skin=new THREE.MeshStandardMaterial({color:"#986344",roughness:.82}),shoe=new THREE.MeshStandardMaterial({color:"#24232a",roughness:.95});
  const person=new THREE.Group();scene.add(person);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.31,.62,5,12),cloth);torso.position.y=1.13;torso.castShadow=true;person.add(torso);
  const apron=new THREE.Mesh(new THREE.BoxGeometry(.43,.53,.055),bodyMat);apron.position.set(0,1.02,.275);apron.castShadow=true;person.add(apron);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.235,20,16),skin);head.position.y=1.78;head.castShadow=true;person.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.24,20,12,0,Math.PI*2,0,Math.PI*.52),dark);hair.position.y=1.84;hair.castShadow=true;person.add(hair);
  const legGeo=new THREE.CylinderGeometry(.105,.12,.68,12);for(const x of [-.14,.14]){const leg=new THREE.Mesh(legGeo,dark);leg.position.set(x,.43,0);leg.castShadow=true;person.add(leg);const foot=new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.32),shoe);foot.position.set(x,.1,.07);foot.castShadow=true;person.add(foot);}
  const armGeo=new THREE.CapsuleGeometry(.095,.48,4,8);for(const x of [-.39,.39]){const arm=new THREE.Mesh(armGeo,cloth);arm.position.set(x,1.19,0);arm.rotation.z=x<0?-.12:.12;arm.castShadow=true;person.add(arm);}
  const badge=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.035),dark);badge.position.set(.14,1.34,.29);person.add(badge);
  const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const observer=new ResizeObserver(resize);observer.observe(el);
  let raf=0,active=true;const animate=()=>{if(!active)return;raf=requestAnimationFrame(animate);person.rotation.y+=.004;renderer.render(scene,camera);};animate();
  return()=>{active=false;cancelAnimationFrame(raf);observer.disconnect();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});renderer.dispose();el.innerHTML="";};
 },[]);
 return <section className="npc-library">
  <div className="npc-library-head"><div><div className="eyebrow">CHARACTER ASSET LIBRARY</div><h2>NPC Library</h2><p>Ready-made characters developers can choose to add to their own games. Nothing is inserted automatically.</p></div><span className="npc-library-count">STARTER PREVIEW · 1 ASSET</span></div>
  <div className="npc-library-grid">
   <article className="npc-asset-card">
    <div className="npc-asset-preview"><div className="npc-preview-label">3D CHARACTER PREVIEW</div><div className="npc-preview-stage" ref={host}/><span className="npc-preview-hint">Rotating model · stylised 3D</span></div>
    <div className="npc-asset-info"><div className="npc-asset-title"><div><h3>Ayo · Market Guide</h3><p>Friendly neighbourhood vendor</p></div><span className="npc-asset-tag">STARTER</span></div>
     <div className="npc-asset-tags"><span>Human</span><span>Everyday</span><span>Dialogue-ready concept</span></div>
     <p className="npc-asset-description">A welcoming street-market character concept for shops, neighbourhood scenes and exploration games.</p>
     <div className="npc-asset-meta"><span>STYLE <b>Stylised low-poly</b></span><span>RIG <b>Preview model only</b></span></div>
    </div>
   </article>
   <div className="npc-library-note"><div className="npc-note-icon">✦</div><b>Built to grow beyond 1,000 NPCs</b><p>This is the first visual library sample, not a completed 1,000-character catalogue. The full library will be organised by role, appearance, culture, outfit, animation and art style.</p><div className="npc-note-stats"><span><b>1</b> preview asset</span><span><b>1,000+</b> library target</span></div></div>
  </div>
 </section>;
}
