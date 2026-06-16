import type { Spot } from "@/types";

export interface TripTemplate {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  stops: Omit<Spot, "id">[];
}

export const TEMPLATES: TripTemplate[] = [
  {
    id: "italy",
    name: "A week in Italy",
    blurb: "Rome to the canals of Venice",
    emoji: "🇮🇹",
    stops: [
      { name: "Rome", lat: 41.9028, lng: 12.4964, countryCode: "IT", day: 1 },
      { name: "Florence", lat: 43.7696, lng: 11.2558, countryCode: "IT", day: 3 },
      { name: "Venice", lat: 45.4408, lng: 12.3155, countryCode: "IT", day: 5 },
      { name: "Milan", lat: 45.4642, lng: 9.19, countryCode: "IT", day: 6 },
    ],
  },
  {
    id: "world",
    name: "Around the world",
    blurb: "Five cities, five continents",
    emoji: "🌍",
    stops: [
      { name: "Tokyo", lat: 35.6762, lng: 139.6503, countryCode: "JP", day: 1 },
      { name: "San Francisco", lat: 37.7749, lng: -122.4194, countryCode: "US", day: 4 },
      { name: "New York", lat: 40.7128, lng: -74.006, countryCode: "US", day: 7 },
      { name: "London", lat: 51.5074, lng: -0.1278, countryCode: "GB", day: 10 },
      { name: "Cairo", lat: 30.0444, lng: 31.2357, countryCode: "EG", day: 13 },
    ],
  },
  {
    id: "california",
    name: "California road trip",
    blurb: "Pacific Coast Highway, LA to SF",
    emoji: "🚗",
    stops: [
      { name: "Los Angeles", lat: 34.0522, lng: -118.2437, countryCode: "US", day: 1 },
      { name: "Santa Barbara", lat: 34.4208, lng: -119.6982, countryCode: "US", day: 2 },
      { name: "Big Sur", lat: 36.2704, lng: -121.8081, countryCode: "US", day: 3 },
      { name: "San Francisco", lat: 37.7749, lng: -122.4194, countryCode: "US", day: 4 },
      { name: "Yosemite", lat: 37.8651, lng: -119.5383, countryCode: "US", day: 6 },
    ],
  },
  {
    id: "golden-triangle",
    name: "India's Golden Triangle",
    blurb: "Delhi, the Taj Mahal, and pink-city Jaipur",
    emoji: "🇮🇳",
    stops: [
      { name: "New Delhi", lat: 28.6139, lng: 77.209, countryCode: "IN", day: 1 },
      { name: "Agra", lat: 27.1767, lng: 78.0081, countryCode: "IN", day: 3 },
      { name: "Jaipur", lat: 26.9124, lng: 75.7873, countryCode: "IN", day: 5 },
    ],
  },
  {
    id: "himalayas",
    name: "Himalayas calling",
    blurb: "From the Ganga at Rishikesh to the hills of Kasol",
    emoji: "🏔️",
    stops: [
      { name: "New Delhi", lat: 28.6139, lng: 77.209, countryCode: "IN", day: 1 },
      { name: "Rishikesh", lat: 30.0869, lng: 78.2676, countryCode: "IN", day: 2 },
      { name: "Manali", lat: 32.2432, lng: 77.1892, countryCode: "IN", day: 4 },
      { name: "Kasol", lat: 32.01, lng: 77.3152, countryCode: "IN", day: 6 },
    ],
  },
];
