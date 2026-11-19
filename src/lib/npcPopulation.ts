export type PopulationNpc = {
  id: string;
  name: string;
  role: string;
  dialogue: string;
  position: [number, number, number];
  radius: number;
  personality: string;
  routine: string;
  greeting: string;
  populationGenerated: true;
  appearance?: { preset?: string; outfit?: string; shoes?: string; carry?: string; description?: string; dailySchedule?: string; behaviourNotes?: string; humanFeatures?: Record<string, boolean>; humanFoundationVersion?: number; humanConfig?: Record<string, unknown> };
  humanFeatures?: Record<string, boolean>;
};

const firstNames = ["Amina","Ayo","Bisi","Chika","Dami","Efe","Emeka","Faruq","Fola","Hadiza","Ife","Ikenna","Jide","Kelechi","Lara","Mariam","Nneka","Obinna","Ola","Olu","Onyeka","Sade","Tari","Tobi","Uche","Zainab","Ada","Boma","Chinwe","David","Ejiro","Farida","Gbenga","Hauwa","Ini","Jumoke","Kemi","Lekan","Moyo","Ngozi","Oghene","Rita","Seyi","Temi","Umar","Yemi","Zara","Abiola","Blessing","Chinedu","Daniel","Esther","Femi","Grace","Ibrahim","Joy","Kunle","Musa","Nana","Peter","Samuel","Tunde"];
const surnames = ["Adebayo","Adeyemi","Afolabi","Agu","Akande","Anyanwu","Balogun","Bello","Chukwu","Danjuma","Eze","Ezeani","Falana","Garba","Ibrahim","Idris","Iheanacho","Johnson","Kalu","Lawal","Musa","Nwosu","Obi","Okafor","Okeke","Okoro","Oladipo","Olawale","Osei","Sani","Soyinka","Udo","Usman","Yakubu","Yusuf","Abubakar","Akinyemi","Bakare","Duru","Etim","Iroko","Jatau","Kehinde","Mordi","Nwachukwu","Ojo","Oni","Salami"];
const roles = ["Shopkeeper","Teacher","Student","Nurse","Doctor","Mechanic","Bus driver","Food vendor","Tailor","Artist","Musician","Farmer","Security officer","Cleaner","Engineer","Photographer","Hair stylist","Barber","Electrician","Plumber","Delivery rider","Market trader","Chef","Builder","Librarian","Journalist","Designer","Gardener","Receptionist","Community volunteer"];
const personalities = ["warm","cheerful","shy","curious","energetic","calm","outgoing","thoughtful","serious","playful","helpful","reserved"];
const routines = ["market","school","clinic","transport","workshop","community","home","garden","creative","hospitality","office","street"];
const greetings = ["Good morning! How is your day going?","Welcome around here. Need any help?","Hello there! Lovely weather to be out.","Hi! I was just heading to my next stop.","Good to see you. Have you explored this area?","Hello! There is always something happening nearby."];
const dialogues = [
  "I have a busy day ahead, but I always make time to greet people in the neighbourhood.",
  "Every day brings a new story around here. You just have to pay attention.",
  "I know these streets quite well. There is usually a quicker route if you look around.",
  "People make this place special. Everyone has somewhere to be and a story to tell.",
  "I am taking a short break before getting back to work. What brings you around?",
  "The neighbourhood changes throughout the day. Mornings and evenings feel completely different."
];

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function generateNpcPopulation(count = 1200, seed = 20261118): PopulationNpc[] {
  const random = seeded(seed);
  return Array.from({ length: Math.max(0, Math.min(5000, Math.floor(count))) }, (_, index) => {
    const first = firstNames[index % firstNames.length];
    const last = surnames[Math.floor(index / firstNames.length) % surnames.length];
    const role = roles[Math.floor(random() * roles.length)];
    const personality = personalities[Math.floor(random() * personalities.length)];
    const routine = routines[Math.floor(random() * routines.length)];
    const x = (random() * 40) - 20;
    const z = (random() * 40) - 20;
    return {
      id: "population-" + seed + "-" + String(index + 1).padStart(4, "0"),
      name: first + " " + last,
      role,
      dialogue: dialogues[Math.floor(random() * dialogues.length)],
      position: [x, 0, z],
      radius: 2.8,
      personality,
      routine,
      greeting: greetings[Math.floor(random() * greetings.length)],
      populationGenerated: true as const
    };
  });
}
