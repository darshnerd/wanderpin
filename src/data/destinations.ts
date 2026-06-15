import type { Spot } from "@/types";

export const DESTINATIONS: Spot[] = [
  { id: "paris", name: "Paris", country: "France", countryCode: "fr", lat: 48.8566, lng: 2.3522, emoji: "🗼", vibe: "Romantic", fact: "The Eiffel Tower can grow ~15 cm taller in summer as its iron expands in the heat." },
  { id: "rome", name: "Rome", country: "Italy", countryCode: "it", lat: 41.9028, lng: 12.4964, emoji: "🏛️", vibe: "Historic", fact: "About €1.5 million in coins is tossed into the Trevi Fountain every year." },
  { id: "cairo", name: "Cairo", country: "Egypt", countryCode: "eg", lat: 30.0444, lng: 31.2357, emoji: "🐪", vibe: "Ancient", fact: "The Great Pyramid stayed the tallest human-made structure for ~3,800 years." },
  { id: "tokyo", name: "Tokyo", country: "Japan", countryCode: "jp", lat: 35.6762, lng: 139.6503, emoji: "🗾", vibe: "Electric", fact: "Shibuya Crossing can move up to 3,000 people every single light change." },
  { id: "petra", name: "Petra", country: "Jordan", countryCode: "jo", lat: 30.3285, lng: 35.4444, emoji: "🏜️", vibe: "Mysterious", fact: "Petra was carved straight into rose-red sandstone cliffs around 312 BC." },
  { id: "reykjavik", name: "Reykjavík", country: "Iceland", countryCode: "is", lat: 64.1466, lng: -21.9426, emoji: "🌋", vibe: "Otherworldly", fact: "Iceland runs almost entirely on geothermal and hydroelectric power." },
  { id: "machu-picchu", name: "Machu Picchu", country: "Peru", countryCode: "pe", lat: -13.1631, lng: -72.545, emoji: "🏔️", vibe: "Lost city", fact: "Built around 1450 and never found by the Spanish conquistadors." },
  { id: "santorini", name: "Santorini", country: "Greece", countryCode: "gr", lat: 36.3932, lng: 25.4615, emoji: "🌅", vibe: "Dreamy", fact: "Its iconic caldera is the rim of a colossal volcanic eruption ~1600 BC." },
  { id: "marrakech", name: "Marrakech", country: "Morocco", countryCode: "ma", lat: 31.6295, lng: -7.9811, emoji: "🕌", vibe: "Vibrant", fact: "The old medina's souks form a maze of more than 3,000 winding alleyways." },
  { id: "cape-town", name: "Cape Town", country: "South Africa", countryCode: "za", lat: -33.9249, lng: 18.4241, emoji: "🏔️", vibe: "Wild", fact: "Table Mountain is one of the oldest mountains on Earth — roughly 260 million years." },
  { id: "sydney", name: "Sydney", country: "Australia", countryCode: "au", lat: -33.8688, lng: 151.2093, emoji: "🏖️", vibe: "Sunny", fact: "The Opera House's sails are clad in over one million self-cleaning tiles." },
  { id: "new-york", name: "New York City", country: "United States", countryCode: "us", lat: 40.7128, lng: -74.006, emoji: "🗽", vibe: "Iconic", fact: "The Statue of Liberty's torch has been closed to the public since 1916." },
  { id: "rio", name: "Rio de Janeiro", country: "Brazil", countryCode: "br", lat: -22.9068, lng: -43.1729, emoji: "⛰️", vibe: "Festive", fact: "Christ the Redeemer gets struck by lightning around four times a year." },
  { id: "kyoto", name: "Kyoto", country: "Japan", countryCode: "jp", lat: 35.0116, lng: 135.7681, emoji: "⛩️", vibe: "Serene", fact: "Fushimi Inari shrine is wrapped in roughly 10,000 vermilion torii gates." },
  { id: "venice", name: "Venice", country: "Italy", countryCode: "it", lat: 45.4408, lng: 12.3155, emoji: "🚤", vibe: "Floating", fact: "Venice is built across ~118 small islands linked by more than 400 bridges." },
  { id: "banff", name: "Banff", country: "Canada", countryCode: "ca", lat: 51.4968, lng: -115.9281, emoji: "🏞️", vibe: "Pristine", fact: "Lake Louise gets its surreal turquoise color from glacial rock flour." },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "ae", lat: 25.2048, lng: 55.2708, emoji: "🏙️", vibe: "Futuristic", fact: "The Burj Khalifa is so tall you can watch the same sunset twice." },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", countryCode: "tr", lat: 41.0082, lng: 28.9784, emoji: "🌉", vibe: "Crossroads", fact: "It's the only major city in the world that straddles two continents." },
  { id: "bali", name: "Bali", country: "Indonesia", countryCode: "id", lat: -8.4095, lng: 115.1889, emoji: "🌴", vibe: "Tropical", fact: "Known as the Island of the Gods, Bali has over 20,000 temples." },
  { id: "queenstown", name: "Queenstown", country: "New Zealand", countryCode: "nz", lat: -45.0312, lng: 168.6626, emoji: "🪂", vibe: "Adventurous", fact: "Commercial bungee jumping was born here in 1988." },
  { id: "prague", name: "Prague", country: "Czechia", countryCode: "cz", lat: 50.0755, lng: 14.4378, emoji: "🏰", vibe: "Fairytale", fact: "Prague Castle is the largest ancient castle complex in the world." },
  { id: "angkor-wat", name: "Angkor Wat", country: "Cambodia", countryCode: "kh", lat: 13.4125, lng: 103.867, emoji: "🛕", vibe: "Majestic", fact: "The largest religious monument on Earth, built in the early 12th century." },
  { id: "grand-canyon", name: "Grand Canyon", country: "United States", countryCode: "us", lat: 36.1069, lng: -112.1129, emoji: "🏜️", vibe: "Vast", fact: "Up to six million years in the making and over a mile deep." },
  { id: "barcelona", name: "Barcelona", country: "Spain", countryCode: "es", lat: 41.3851, lng: 2.1734, emoji: "🎨", vibe: "Artistic", fact: "Gaudí's Sagrada Família has been under construction since 1882." },
  { id: "tromso", name: "Tromsø", country: "Norway", countryCode: "no", lat: 69.6492, lng: 18.9553, emoji: "🌌", vibe: "Magical", fact: "One of the best places on Earth to catch the northern lights." },
  { id: "cairns", name: "Cairns", country: "Australia", countryCode: "au", lat: -16.9186, lng: 145.7781, emoji: "🐠", vibe: "Underwater", fact: "Gateway to the Great Barrier Reef — the largest living structure on Earth." },
];

export const SEED_TRIP: Spot[] = ["paris", "rome", "cairo"].map((id) => {
  const d = DESTINATIONS.find((x) => x.id === id)!;
  return { ...d, id: `seed-${id}` };
});

export function pickRandomDestination(excludeIds: string[] = []): Spot {
  const pool = DESTINATIONS.filter((d) => !excludeIds.includes(d.id));
  const list = pool.length > 0 ? pool : DESTINATIONS;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}
