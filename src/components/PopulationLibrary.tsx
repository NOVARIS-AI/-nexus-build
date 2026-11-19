import { useEffect, useMemo, useRef, useState } from "react";
import AraCharacterCard from "./AraCharacterCard";
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
export default function PopulationLibrary({ onPreview }: { onPreview: (npc: PopulationNpc) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [visibleCount, setVisibleCount] = useState(24);
  const gridRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
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
  const visibleNpcs = filtered.slice(0, visibleCount);
  useEffect(() => { setVisibleCount(24); }, [query, category]);
  useEffect(() => {
    const root = gridRef.current;
    const sentinel = loadMoreRef.current;
    if (!root || !sentinel || visibleCount >= filtered.length) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setVisibleCount(current => Math.min(current + 24, filtered.length));
    }, { root, rootMargin: "280px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);
  return <section className="population-library">
    <div className="population-library-top">
      <div><span className="eyebrow">NEXUS CHARACTER DATABASE</span><h2>Resident index</h2><p>Browse 1,200+ residents with real 3D character previews. Models stream in as you scroll to keep the gallery responsive.</p></div>
      <div className="population-total"><b>{population.length.toLocaleString()}</b><span>NPC PROFILES</span></div>
    </div>
    <div className="population-search-row">
      <label className="population-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search NPCs, roles, traits or IDs…" aria-label="Search NPC library"/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}</label>
      <span className="population-results">{filtered.length.toLocaleString()} MATCHING NPCs</span>
    </div>
    <div className="population-category-list" aria-label="Filter NPCs by category">
      {categories.map(item => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}<span>{counts[item]}</span></button>)}
    </div>
    <div className="population-index-heading"><div><b>{category === "All" ? "All residents" : category}</b><small>Sorted by generated index · Real Ara 3D character previews · Select to customise</small></div><span>SHOWING {visibleNpcs.length.toLocaleString()} / {filtered.length.toLocaleString()}</span></div>
    {filtered.length ? <div className="population-card-grid" ref={gridRef}>
      {visibleNpcs.map((npc, index) => <article className="population-card" key={npc.id}>
        <div className="population-preview-box" style={{"--avatar-hue": (index * 47 + 24) % 360} as React.CSSProperties}>
          <div className="population-preview-glow" />
          <AraCharacterCard id={npc.id} name={npc.name} index={index} />
          <span className="population-preview-caption">FULL BODY · {String(index + 1).padStart(4,"0")}</span>
        </div>
        <div className="population-card-copy"><b>{npc.name}</b><small>{npc.role}</small><em>{categoryFor(npc)} · {npc.personality}</em></div>
        <button type="button" className="population-preview-button" onClick={() => onPreview(npc)}>Preview & customise <span>↗</span></button>
      </article>)}
      {visibleNpcs.length < filtered.length && <div className="population-load-sentinel" ref={loadMoreRef}>Loading the next characters as you scroll…</div>}
    </div> : <div className="population-empty"><b>No NPCs found</b><span>Try another name, role, personality or category.</span><button type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button></div>}
    <p className="population-library-foot">Each resident card loads a real Ara 3D human preview as you scroll. The 1,200+ profiles remain searchable; only a small number of 3D previews are mounted at once to protect device memory. Profiles use the available Ara starter presets with deterministic appearance variations. Imported/share-linked Ara designs can be used in the character studio.</p>
  </section>;
}
