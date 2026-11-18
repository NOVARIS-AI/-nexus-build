export type HumanActivity = "idle" | "sit" | "rest" | "lean" | "work" | "eat" | "drink" | "sleep" | "talk";
export type HumanState = {
  activity: HumanActivity;
  remaining: number;
  decisionIn: number;
  energy: number;
  hunger: number;
  thirst: number;
  familiarity: number;
  interactions: number;
  lastInteraction: number;
};
export type HumanProp = { x: number; z: number; kind: string; name: string };

export function createHumanState(seed = 0): HumanState {
  return { activity: "idle", remaining: 0, decisionIn: 4 + (seed % 7), energy: .72 + (seed % 4) * .06, hunger: .12 + (seed % 5) * .035, thirst: .1 + (seed % 4) * .04, familiarity: 0, interactions: 0, lastInteraction: 0 };
}

export function rememberHumanInteraction(state: HumanState, now: number) {
  state.interactions += 1;
  state.familiarity = Math.min(1, state.familiarity + .16);
  state.lastInteraction = now;
}

function propActivity(prop: HumanProp | undefined, role: string, routine: string): HumanActivity | null {
  if (!prop) return null;
  const label = (prop.kind + " " + prop.name).toLowerCase();
  if (/bed|mattress|bedroom/.test(label)) return "sleep";
  if (/chair|bench|stool|sofa|seat/.test(label)) return "sit";
  if (/desk|counter|workbench|shop|stall|table/.test(label)) return "work";
  if (/plant|garden|flower/.test(label) && /garden|farmer|gardener/.test(role + " " + routine)) return "work";
  if (/food|restaurant|kitchen/.test(label)) return "eat";
  return null;
}

export function tickHumanState(state: HumanState, dt: number, elapsed: number, role: string, routine: string, nearbyProp?: HumanProp, social = false, playerNearby = false): HumanActivity {
  state.hunger = Math.min(1, state.hunger + dt * .0022);
  state.thirst = Math.min(1, state.thirst + dt * .0031);
  if (state.activity === "walk") state.energy = Math.max(0, state.energy - dt * .006);
  else state.energy = Math.min(1, state.energy + dt * (state.activity === "sleep" ? .09 : .018));
  if (social) { state.activity = "talk"; state.remaining = Math.max(state.remaining, .4); return state.activity; }
  if (playerNearby) { if (state.activity === "talk") state.activity = "idle"; return state.activity; }
  state.remaining = Math.max(0, state.remaining - dt);
  state.decisionIn -= dt;
  if (state.remaining > 0) return state.activity;
  if (state.decisionIn > 0) return state.activity;
  state.decisionIn = 7 + ((Math.floor(elapsed * 10) % 9) * .9);
  const minute = (elapsed * 8) % 1440;
  const night = minute >= 1320 || minute < 360;
  const workHours = minute >= 450 && minute < 1020;
  let next: HumanActivity = "idle";
  if (night && state.energy < .9) next = propActivity(nearbyProp, role, routine) === "sleep" ? "sleep" : "rest";
  else if (state.thirst > .76) next = "drink";
  else if (state.hunger > .78) next = "eat";
  else if (workHours && /shop|market|workshop|school|clinic|transport|office|garden|creative/.test(routine)) next = propActivity(nearbyProp, role, routine) === "work" ? "work" : "idle";
  else if (state.energy < .28) next = propActivity(nearbyProp, role, routine) === "sit" ? "sit" : "rest";
  else if (nearbyProp) next = propActivity(nearbyProp, role, routine) ?? "idle";
  else if (Math.sin(elapsed * .31) > .82) next = "lean";
  state.activity = next;
  state.remaining = next === "sleep" ? 14 : next === "work" ? 5 + (elapsed % 7) : next === "idle" ? 2 : 3 + (elapsed % 4);
  if (next === "eat") state.hunger = Math.max(.12, state.hunger - .48);
  if (next === "drink") state.thirst = Math.max(.08, state.thirst - .58);
  return state.activity;
}

export function humanGreeting(state: HumanState, name: string, greeting?: string) {
  if (state.familiarity > .62) return name + ": Good to see you again! " + (state.interactions > 3 ? "How have you been?" : "Nice that you came back.");
  if (state.familiarity > .2) return name + ": Hey, I remember you. " + (greeting ?? "How is your day going?");
  return name + ": " + (greeting ?? "Hello there! Nice to meet you.");
}
