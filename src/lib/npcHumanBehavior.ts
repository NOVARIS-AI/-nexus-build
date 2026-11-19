export type HumanActivity = "idle" | "sit" | "rest" | "lean" | "work" | "eat" | "drink" | "sleep" | "talk";
export type HumanWeather = "clear" | "rain" | "heat" | "wind";
export type HumanNoise = "quiet" | "normal" | "busy";
export type HumanEvent = "none" | "market" | "festival";
export type HumanEnvironment = { weather: HumanWeather; noise: HumanNoise; event: HumanEvent };
export const DEFAULT_HUMAN_ENVIRONMENT: HumanEnvironment = { weather: "clear", noise: "normal", event: "none" };
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
  comfort: number;
  stress: number;
  socialNeed: number;
};
export type HumanProp = { x: number; z: number; kind: string; name: string };

export function createHumanState(seed = 0): HumanState {
  return {
    activity: "idle", remaining: 0, decisionIn: 4 + (seed % 7),
    energy: .72 + (seed % 4) * .06, hunger: .12 + (seed % 5) * .035,
    thirst: .1 + (seed % 4) * .04, familiarity: 0, interactions: 0,
    lastInteraction: 0, comfort: .82, stress: .12, socialNeed: .28
  };
}

export function rememberHumanInteraction(state: HumanState, now: number) {
  state.interactions += 1;
  state.familiarity = Math.min(1, state.familiarity + .16);
  state.socialNeed = Math.max(.08, state.socialNeed - .38);
  state.stress = Math.max(0, state.stress - .12);
  state.lastInteraction = now;
}

function propActivity(prop: HumanProp | undefined, role: string, routine: string): HumanActivity | null {
  if (!prop) return null;
  const label = (prop.kind + " " + prop.name).toLowerCase();
  if (/bed|mattress|bedroom/.test(label)) return "sleep";
  if (/chair|bench|stool|sofa|seat/.test(label)) return "sit";
  if (/desk|counter|workbench|shop|stall|table/.test(label)) return "work";
  if (/plant|garden|flower/.test(label) && /garden|farmer|gardener/.test(role + " " + routine)) return "work";
  if (/food|restaurant|kitchen|cafe/.test(label)) return "eat";
  if (/shelter|bus stop|gazebo|covered|shade/.test(label)) return "rest";
  return null;
}

export function tickHumanState(
  state: HumanState,
  dt: number,
  elapsed: number,
  role: string,
  routine: string,
  nearbyProp?: HumanProp,
  social = false,
  playerNearby = false,
  moving = false,
  environment: HumanEnvironment = DEFAULT_HUMAN_ENVIRONMENT
): HumanActivity {
  const hot = environment.weather === "heat";
  const rainy = environment.weather === "rain";
  const busy = environment.noise === "busy";
  const sheltered = !!nearbyProp && /shelter|bus stop|gazebo|covered|shade|cafe|house|indoor/i.test(nearbyProp.kind + " " + nearbyProp.name);
  state.hunger = Math.min(1, state.hunger + dt * .0022);
  state.thirst = Math.min(1, state.thirst + dt * (hot ? .0052 : .0031));
  state.socialNeed = Math.min(1, state.socialNeed + dt * (environment.event === "festival" ? .0011 : .0018));
  state.stress = Math.max(0, Math.min(1, state.stress + dt * (busy ? .018 : environment.noise === "quiet" ? -.012 : -.004)));
  const weatherPenalty = hot ? .018 : rainy && !sheltered ? .024 : environment.weather === "wind" ? .006 : 0;
  state.comfort = Math.max(0, Math.min(1, state.comfort + dt * ((sheltered ? .025 : .006) - weatherPenalty - (busy ? .004 : 0))));
  if (moving) state.energy = Math.max(0, state.energy - dt * .006);
  else state.energy = Math.min(1, state.energy + dt * (state.activity === "sleep" ? .09 : .018));
  if (social) {
    state.activity = "talk";
    state.remaining = Math.max(state.remaining, .4);
    state.socialNeed = Math.max(.05, state.socialNeed - dt * .8);
    state.stress = Math.max(0, state.stress - dt * .025);
    return state.activity;
  }
  if (playerNearby) {
    if (state.activity === "talk") state.activity = "idle";
    return state.activity;
  }
  state.remaining = Math.max(0, state.remaining - dt);
  state.decisionIn -= dt;
  if (state.remaining > 0 || state.decisionIn > 0) return state.activity;
  state.decisionIn = 7 + ((Math.floor(elapsed * 10) % 9) * .9);
  const minute = (elapsed * 8) % 1440;
  const night = minute >= 1320 || minute < 360;
  const workHours = minute >= 450 && minute < 1020;
  const nearProp = propActivity(nearbyProp, role, routine);
  let next: HumanActivity = "idle";
  if (night && state.energy < .9) next = nearProp === "sleep" ? "sleep" : "rest";
  else if (state.thirst > (hot ? .58 : .76)) next = "drink";
  else if (state.hunger > .78) next = "eat";
  else if (rainy && !sheltered && nearProp !== "work") next = "rest";
  else if (state.comfort < .24 || state.stress > .78) next = nearProp === "sit" ? "sit" : "rest";
  else if ((environment.event === "festival" || environment.event === "market") && state.socialNeed > .5 && !busy) next = "talk";
  else if (workHours && /shop|market|workshop|school|clinic|transport|office|garden|creative/.test(routine)) next = nearProp === "work" ? "work" : "idle";
  else if (state.energy < .28) next = nearProp === "sit" ? "sit" : "rest";
  else if (nearbyProp) next = nearProp ?? "idle";
  else if (state.socialNeed > .82 && !busy) next = "talk";
  else if (Math.sin(elapsed * .31) > .82) next = "lean";
  state.activity = next;
  state.remaining = next === "sleep" ? 14 : next === "work" ? 5 + (elapsed % 7) : next === "idle" ? 2 : next === "talk" ? 2.5 : 3 + (elapsed % 4);
  if (next === "eat") state.hunger = Math.max(.12, state.hunger - .48);
  if (next === "drink") state.thirst = Math.max(.08, state.thirst - .58);
  if (next === "rest" || next === "sit") { state.stress = Math.max(0, state.stress - .2); state.comfort = Math.min(1, state.comfort + .16); }
  if (next === "talk") state.socialNeed = Math.max(.08, state.socialNeed - .3);
  return state.activity;
}

export function humanGreeting(
  state: HumanState,
  name: string,
  greeting?: string,
  environment: HumanEnvironment = DEFAULT_HUMAN_ENVIRONMENT
) {
  let opener = greeting ?? "Hello there! Nice to meet you.";
  if (environment.weather === "heat") opener = "It's quite hot today. " + opener;
  else if (environment.weather === "rain") opener = "Looks like rain is settling in. " + opener;
  else if (environment.event === "festival") opener = "There's a lovely festival atmosphere today. " + opener;
  else if (environment.event === "market") opener = "The market is lively today. " + opener;
  if (state.familiarity > .62) return name + ": Good to see you again! " + (state.interactions > 3 ? "How have you been?" : "Nice that you came back.");
  if (state.familiarity > .2) return name + ": Hey, I remember you. " + opener;
  return name + ": " + opener;
}
