import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import { MODE_META, legMode } from "@/lib/transport";
import { flagEmoji } from "@/lib/utils";
import type { ViewProps } from "@/types";

const DefaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ClickHandler({ onAddPin }: { onAddPin: ViewProps["onAddPin"] }) {
  useMapEvents({
    click(e) {
      onAddPin(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyController({ handleRef }: { handleRef: ViewProps["handleRef"] }) {
  const map = useMap();
  useEffect(() => {
    handleRef.current = {
      flyTo: (lat, lng, opts) => {
        map.flyTo([lat, lng], opts?.zoom ?? 6, { duration: 1.2 });
      },
      fitToTrip: (t) => {
        if (t.length === 0) return;
        if (t.length === 1) {
          map.flyTo([t[0].lat, t[0].lng], 6, { duration: 1.2 });
          return;
        }
        const bounds = L.latLngBounds(
          t.map((s) => [s.lat, s.lng] as [number, number]),
        );
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 8,
          animate: true,
          duration: 1.2,
        });
      },
    };
    return () => {
      handleRef.current = null;
    };
  }, [map, handleRef]);
  return null;
}

export default function MapView({
  trip,
  selectedId,
  onAddPin,
  onSelectPin,
  handleRef,
}: ViewProps) {
  const center: [number, number] = trip.length
    ? [trip[0].lat, trip[0].lng]
    : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={trip.length ? 4 : 2}
      minZoom={2}
      worldCopyJump
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ZoomControl position="bottomright" />
      <ClickHandler onAddPin={onAddPin} />
      <FlyController handleRef={handleRef} />

      {trip.map((spot, i) => {
        if (i === 0) return null;
        const meta = MODE_META[legMode(trip, i)];
        return (
          <Polyline
            key={`leg-${spot.id}`}
            positions={[
              [trip[i - 1].lat, trip[i - 1].lng],
              [spot.lat, spot.lng],
            ]}
            pathOptions={{
              color: meta.color,
              weight: 3,
              opacity: 0.85,
              dashArray: meta.surface ? undefined : "1 10",
              lineCap: "round",
            }}
          />
        );
      })}

      {trip.map((spot) => (
        <Marker
          key={spot.id}
          position={[spot.lat, spot.lng]}
          opacity={selectedId && selectedId !== spot.id ? 0.7 : 1}
          eventHandlers={{ click: () => onSelectPin(spot.id) }}
        >
          <Popup>
            <div className="space-y-0.5">
              <div className="font-semibold">
                {spot.emoji ?? flagEmoji(spot.countryCode)} {spot.name}
              </div>
              {spot.country && (
                <div className="text-xs text-neutral-500">{spot.country}</div>
              )}
              {spot.fact && (
                <div className="max-w-[12rem] text-xs">{spot.fact}</div>
              )}
              {spot.note && (
                <div className="max-w-[12rem] text-xs italic text-neutral-600">
                  {spot.note}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
