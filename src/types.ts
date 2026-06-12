export interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country?: string;
  countryCode?: string;
  emoji?: string;
  fact?: string;
  vibe?: string;
}

export type Trip = Spot[];

export type ViewMode = "globe" | "map";

export interface MapHandle {
  flyTo: (lat: number, lng: number, opts?: { zoom?: number }) => void;
}

export interface ViewProps {
  trip: Trip;
  selectedId: string | null;
  onAddPin: (lat: number, lng: number) => void;
  onSelectPin: (id: string | null) => void;
  handleRef: React.RefObject<MapHandle | null>;
}
