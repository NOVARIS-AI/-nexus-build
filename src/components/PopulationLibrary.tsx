import { useMemo, useState } from "react";
import { generateNpcPopulation, type PopulationNpc } from "../lib/npcPopulation";

type Category = "All" | "Business" | "Education" | "Healthcare" | "Transport" | "Creative" | "Skilled trades" | "Public services" | "Community";
const categories: Category[] = ["All", "Business", "Education", "Healthcare", "Transport", "Creative", "Skilled trades", "Public services", "Community"];
const roleCategory: Record<string, Category> = {
  Shopkeeper: "Business", "Food vendor": "Business", "Market trader": "Business", Chef: "Business", Receptionist: "Business",
  Teacher: "Education", Student: "Education", Librarian: "Education",
  Nurse: "Healthcare", Doctor: "Healthcare",
  "Bus driver": "Transport", "Delivery rider": "Transport",
  Artist: "Creative", Musician: "Creative", Photographer: "Creative", "Hair stylist": "Creative", Barber: "Creative", Designer: "Creative", Journalist: "Creative",
  Mechanic: "Skilled trades", Tailor: "Skilled trades", Engineer: "Skilled trades", Electrician: "Skilled trades", Plumber: "Skilled trades", Builder: "Skilled trades", Farmer: "Skilled trades", Gardener: "Skilled trades",
  "Security officer": "Public services", Cleaner: "Public services", "Community volunteer": "Community"
};
function categoryFor(npc: PopulationNpc): Category {
  return roleCategory[npc.role] ?? "Community";
}
function CharacterThumbnail({ npc, index }: { npc: PopulationNpc; index: number }) {
  const seed = Number(npc.id.match(/(\\d+)$/)?.[1] ?? index + 1);
  const skin = ["#8d5b42", "#b87955", "#d69b72", "#6e4939", "#a96f58", "#e0ad85"][seed % 6];
  const hair = ["#201b1a", "#30251e", "#16191e", "#3b2925", "#68442f"][Math.floor(seed / 2) % 5];
  const outfit = ["#6685a8", "#a66d69", "#668b75", "#b18a57", "#8675a8", "#5f9294", "#9a718f", "#8a795f"][seed % 8];
  const trousers = ["#34313a", "#343c4c", "#4b3d35", "#293c38", "#514052"][Math.floor(seed / 3) % 5];
  const style = seed % 4;
  const hairStyle = seed % 3;
  const hasHat = seed % 7 === 0;
  const accessory = seed % 5 === 0;
  return <svg className="population-character-art" viewBox="0 0 160 220" role="img" aria-label={`Full-body character thumbnail for ${npc.name}, ${npc.role}`}>
    <defs>
      <linearGradient id={`outfit-${seed}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={outfit}/><stop offset="1" stopColor={outfit} stopOpacity=".58"/></linearGradient>
      <linearGradient id={`skin-${seed}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={skin}/><stop offset="1" stopColor={skin} stopOpacity=".72"/></linearGradient>
    </defs>
    <ellipse cx="80" cy="207" rx="39" ry="7" fill="#000" opacity=".3"/>
    <path d={style===2?"M62 137 L98 137 L103 194 L86 194 L80 159 L74 194 L57 194 Z":"M62 135 L98 135 L95 192 L82 192 L80 157 L76 192 L63 192 Z"} fill={trousers}/>
    <path d="M62 188 L78 188 L78 201 Q69 205 57 201 Z M83 188 L98 188 L104 201 Q94 205 82 201 Z" fill="#24232a"/>
    <path d="M57 200 Q66 196 79 201 L79 207 L55 207 Q52 204 57 200 Z M82 201 Q95 196 104 201 L109 207 L83 207 Z" fill="#17171d"/>
    <path d={style===1?"M54 79 Q80 70 106 79 L111 139 Q80 151 49 139 Z":style===2?"M54 80 Q80 70 106 80 L103 146 L57 146 Z":"M55 80 Q80 70 105 80 L101 139 Q80 147 59 139 Z"} fill={`url(#outfit-${seed})`} stroke="#ffffff" strokeOpacity=".18" strokeWidth="1.5"/>
    {style===0 && <path d="M70 78 L80 93 L90 78 L85 115 L75 115 Z" fill="#eee5d8" opacity=".9"/>}
    {style===1 && <path d="M55 84 L70 88 L66 145 L51 141 Z M105 84 L90 88 L94 145 L109 141 Z" fill="#fff" opacity=".12"/>}
    {style===2 && <path d="M80 84 L80 141" stroke="#f5e8d6" strokeOpacity=".45" strokeWidth="2"/>}
    {style===3 && <path d="M60 112 Q80 124 100 112" fill="none" stroke="#f3e8da" strokeOpacity=".65" strokeWidth="2"/>}
    <path d="M59 88 Q47 91 48 116 L54 128 L63 124 L66 101 Z M101 88 Q113 91 112 116 L106 128 L97 124 L94 101 Z" fill={`url(#skin-${seed})`}/>
    <ellipse cx="51" cy="128" rx="6" ry="8" fill={skin}/><ellipse cx="109" cy="128" rx="6" ry="8" fill={skin}/>
    <rect x="73" y="64" width="14" height="20" rx="6" fill={skin}/>
    <ellipse cx="80" cy="47" rx="21" ry="25" fill={`url(#skin-${seed})`}/>
    <path d={hairStyle===0?"M59 45 Q56 17 80 18 Q105 17 102 46 Q95 32 82 32 Q69 31 59 45 Z":hairStyle===1?"M59 43 Q55 15 80 17 Q105 15 101 44 L97 32 Q90 23 79 25 Q67 24 62 34 Z":"M59 44 Q58 19 80 18 Q103 18 102 44 Q95 27 80 30 Q67 29 59 44 Z"} fill={hair}/>
    {hairStyle===1 && <path d="M58 36 Q49 53 58 67 L64 60 L65 39 Z M102 35 Q111 52 102 67 L96 60 L95 39 Z" fill={hair}/>}
    {hasHat && <><path d="M57 29 Q80 5 103 29 L99 37 L61 37 Z" fill={outfit}/><path d="M53 36 Q80 30 107 36" stroke="#e8d5bd" strokeWidth="4" strokeLinecap="round"/></>}
    <circle cx="72" cy="48" r="1.8" fill="#241d1b"/><circle cx="88" cy="48" r="1.8" fill="#241d1b"/>
    <path d="M75 59 Q80 62 85 59" fill="none" stroke="#70483d" strokeWidth="1.5" strokeLinecap="round"/>
    {accessory && <><path d="M99 93 L113 99 L111 137 L98 134 Z" fill="#5c4438" stroke="#d4b18e" strokeOpacity=".6"/><path d="M99 94 Q105 86 112 98" fill="none" stroke="#d4b18e" strokeWidth="2"/></>}
    <path d="M64 140 L96 140" stroke="#fff" strokeOpacity=".16" strokeWidth="1"/>
  </svg>;
}
export default function PopulationLibrary({ onPreview }: { onPreview: (npc: PopulationNpc) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const population = useMemo(() => generateNpcPopulation(1200), []);
  const counts = useMemo(() => categories.reduce((result, item) => {
    result[item] = item === "All" ? population.length : population.filter(npc => categoryFor(npc) === item).length;
    return result;
  }, {} as Record<Category, number>), [population]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return population.filter(npc => {
      const categoryMatch = category === "All" || categoryFor(npc) === category;
      const searchMatch = !term || [npc.name, npc.role, npc.personality, npc.routine, npc.greeting, npc.id].some(value => value.toLowerCase().includes(term));
      return categoryMatch && searchMatch;
    });
  }, [population, query, category]);
  return <section className="population-library">
    <div className="population-library-top">
      <div><span className="eyebrow">NEXUS CHARACTER DATABASE</span><h2>Resident index</h2><p>Browse the generated NPC roster. Search names, occupations, personalities, routines or character IDs.</p></div>
      <div className="population-total"><b>{population.length.toLocaleString()}</b><span>NPC PROFILES</span></div>
    </div>
    <div className="population-search-row">
      <label className="population-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search NPCs, roles, traits or IDs…" aria-label="Search NPC library"/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}</label>
      <span className="population-results">{filtered.length.toLocaleString()} MATCHING NPCs</span>
    </div>
    <div className="population-category-list" aria-label="Filter NPCs by category">
      {categories.map(item => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}<span>{counts[item]}</span></button>)}
    </div>
    <div className="population-index-heading"><div><b>{category === "All" ? "All residents" : category}</b><small>Sorted by generated index · Every resident has a full-body character thumbnail · Select to customise</small></div><span>SHOWING {filtered.length.toLocaleString()} / {population.length.toLocaleString()}</span></div>
    {filtered.length ? <div className="population-card-grid">
      {filtered.map((npc, index) => <article className="population-card" key={npc.id}>
        <div className="population-preview-box" style={{"--avatar-hue": (index * 47 + 24) % 360} as React.CSSProperties}>
          <div className="population-preview-glow" />
          <CharacterThumbnail npc={npc} index={index} />
          <span className="population-preview-caption">FULL BODY · {String(index + 1).padStart(4,"0")}</span>
        </div>
        <div className="population-card-copy"><b>{npc.name}</b><small>{npc.role}</small><em>{categoryFor(npc)} · {npc.personality}</em></div>
        <button type="button" className="population-preview-button" onClick={() => onPreview(npc)}>Preview & customise <span>↗</span></button>
      </article>)}
    </div> : <div className="population-empty"><b>No NPCs found</b><span>Try another name, role, personality or category.</span><button type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button></div>}
    <p className="population-library-foot">The library creates distinct full-body illustrated previews from each resident profile. The interactive 3D editor remains a shared workspace; these thumbnails are not separate exported 3D model files.</p>
  </section>;
}
