export type HumanFeature =
  | "breathing" | "blinking" | "naturalIdle" | "walking" | "running" | "collision"
  | "obstacleAwareness" | "sitting" | "standing" | "resting" | "dailyRoutines"
  | "socialInteraction" | "objectInteraction" | "coughing" | "sneezing" | "hiccups"
  | "yawning" | "sweating" | "stretching" | "facialExpressions"
  | "advancedConversations" | "longTermMemory" | "advancedProceduralAnimation"
  | "environmentalNeeds";

export type HumanFeatureSettings = Partial<Record<HumanFeature, boolean>>;

export type HumanFoundationProfile = {
  version: 1;
  features: Record<HumanFeature, boolean>;
};

export type HumanFoundationSubject = {
  id: string;
  humanFeatures?: HumanFeatureSettings;
};

export const HUMAN_FOUNDATION_DEFAULTS: Record<HumanFeature, boolean> = {
  breathing: true,
  blinking: true,
  naturalIdle: true,
  walking: true,
  running: true,
  collision: true,
  obstacleAwareness: true,
  sitting: true,
  standing: true,
  resting: true,
  dailyRoutines: true,
  socialInteraction: true,
  objectInteraction: true,
  coughing: true,
  sneezing: true,
  hiccups: false,
  yawning: true,
  sweating: true,
  stretching: true,
  facialExpressions: false,
  advancedConversations: false,
  longTermMemory: false,
  advancedProceduralAnimation: false,
  environmentalNeeds: false
};

export const OPTIONAL_HUMAN_FEATURES: HumanFeature[] = [
  "hiccups", "facialExpressions", "advancedConversations", "longTermMemory",
  "advancedProceduralAnimation", "environmentalNeeds"
];

export function resolveHumanFoundation(
  subject?: HumanFoundationSubject | null,
  globalOverrides?: HumanFeatureSettings
): HumanFoundationProfile {
  const features = { ...HUMAN_FOUNDATION_DEFAULTS };
  for (const feature of Object.keys(features) as HumanFeature[]) {
    const globalValue = globalOverrides?.[feature];
    const subjectValue = subject?.humanFeatures?.[feature];
    if (typeof globalValue === "boolean") features[feature] = globalValue;
    if (typeof subjectValue === "boolean") features[feature] = subjectValue;
  }
  return { version: 1, features };
}

export function setHumanFeature(
  subject: HumanFoundationSubject,
  feature: HumanFeature,
  enabled: boolean
): HumanFoundationSubject {
  return {
    ...subject,
    humanFeatures: { ...(subject.humanFeatures ?? {}), [feature]: enabled }
  };
}

export function featureSupportsImportedRig(feature: HumanFeature, animationNames: string[]): boolean {
  const names = animationNames.join(" ").toLowerCase();
  const patterns: Partial<Record<HumanFeature, RegExp>> = {
    sitting: /sit|seated|chair/,
    resting: /rest|sleep|lie/,
    socialInteraction: /talk|speak|conversation|gesture/,
    coughing: /cough/,
    sneezing: /sneeze/,
    hiccups: /hiccup/,
    yawning: /yawn/,
    stretching: /stretch/,
    facialExpressions: /face|expression|smile|frown/,
    breathing: /breath|idle/
  };
  const pattern = patterns[feature];
  return pattern ? pattern.test(names) : true;
}

export function seededHumanChoice(seed: string, options: readonly string[]): string {
  if (!options.length) return "";
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return options[(hash >>> 0) % options.length];
}

export function getAraCharacterAppearance(id: string) {
  return {
    preset: seededHumanChoice(id + "-preset", ["The Female Executive", "The Adventurer", "The Detective", "The Athlete"]),
    outfit: seededHumanChoice(id + "-outfit", ["#6685a8", "#a66d69", "#668b75", "#b18a57", "#8675a8", "#5f9294", "#9a718f", "#8a795f"]),
    shoes: seededHumanChoice(id + "-shoes", ["#29252b", "#343c4c", "#4b3d35", "#293c38"]),
    carry: "#8a6549"
  };
}
