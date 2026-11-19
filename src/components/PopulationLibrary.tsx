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
function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(part => part[0] ?? "").join("").toUpperCase();
}
export default function PopulationLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [expanded, setExpanded] = useState<string | null>(null);
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
    <div className="population-index-heading"><div><b>{category === "All" ? "All residents" : category}</b><small>Sorted by generated index · Select a profile to inspect its details</small></div><span>SHOWING {filtered.length.toLocaleString()} / {population.length.toLocaleString()}</span></div>
    {filtered.length ? <div className="population-card-grid">
      {filtered.map((npc, index) => <article className={expanded === npc.id ? "population-card expanded" : "population-card"} key={npc.id}>
        <button type="button" className="population-card-main" onClick={() => setExpanded(current => current === npc.id ? null : npc.id)} aria-expanded={expanded === npc.id}>
          <span className="population-avatar" style={{"--avatar-hue": (index * 47 + 24) % 360} as React.CSSProperties}>{initials(npc.name)}</span>
          <span className="population-card-copy"><b>{npc.name}</b><small>{npc.role}</small><em>{categoryFor(npc)} · {npc.personality}</em></span>
          <span className="population-card-arrow">{expanded === npc.id ? "−" : "+"}</span>
        </button>
        {expanded === npc.id && <div className="population-card-detail">
          <div><span>PROFILE ID</span><b>{npc.id}</b></div>
          <div><span>DAILY ROUTINE</span><b>{npc.routine}</b></div>
          <p>“{npc.greeting}”</p><small>{npc.dialogue}</small>
        </div>}
      </article>)}
    </div> : <div className="population-empty"><b>No NPCs found</b><span>Try another name, role, personality or category.</span><button type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button></div>}
    <p className="population-library-foot">These are 1,200 generated resident profiles with varied names, roles, routines and personalities—not 1,200 individually modelled 3D characters. Add or customise characters in NPC Studio.</p>
  </section>;
}
