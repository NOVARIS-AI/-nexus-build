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

export function resolveHumanFoundation(subject?: HumanFoundationSubject | null): HumanFoundationProfile {
  const features = { ...HUMAN_FOUNDATION_DEFAULTS };
  if (subject?.humanFeatures) {
    for (const feature of Object.keys(features) as HumanFeature[]) {
      const override = subject.humanFeatures[feature];
      if (typeof override === "boolean") features[feature] = override;
    }
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
