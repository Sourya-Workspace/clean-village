import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { isValidCoordinatePair } from '../services/geocoding';

// Fix default Leaflet marker icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const INDIA_OVERVIEW_CENTER = { lat: 20.5937, lng: 78.9629 };

export default function VillageMap({
  center = null,
  zoom = null,
  markers = [],
  selectable = false,
  onSelectCoordinates = null,
  height = '280px',
  showSingleMarker = true,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const hasValidCenter = center && isValidCoordinatePair(center.lat, center.lng);
  const initialLat = hasValidCenter ? Number(center.lat) : INDIA_OVERVIEW_CENTER.lat;
  const initialLng = hasValidCenter ? Number(center.lng) : INDIA_OVERVIEW_CENTER.lng;
  const initialZoom = zoom || (hasValidCenter ? 14 : 5);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([initialLat, initialLng], initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    if (selectable && onSelectCoordinates) {
      map.on('click', (e) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        if (isValidCoordinatePair(lat, lng)) {
          onSelectCoordinates({ lat, lng });
        }
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (markers && markers.length > 0) {
      const validBounds = [];
      markers.forEach((m) => {
        if (isValidCoordinatePair(m.lat, m.lng)) {
          const lat = Number(m.lat);
          const lng = Number(m.lng);
          validBounds.push([lat, lng]);
          const marker = L.marker([lat, lng]);
          if (m.label) {
            marker.bindPopup(
              `<div style="font-family: Inter, sans-serif; font-size: 12px;">
                <strong>${m.label}</strong><br/>
                <span>${m.sublabel || ''}</span>
              </div>`
            );
          }
          marker.addTo(layerGroup);
        }
      });
      if (validBounds.length === 1) {
        map.setView(validBounds[0], 14);
      } else if (validBounds.length > 1) {
        map.fitBounds(validBounds, { padding: [30, 30], maxZoom: 14 });
      }
    } else if (showSingleMarker && hasValidCenter) {
      const lat = Number(center.lat);
      const lng = Number(center.lng);
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
      const marker = L.marker([lat, lng], { draggable: Boolean(selectable && onSelectCoordinates) });
      marker.bindPopup(
        `<div style="font-family: Inter, sans-serif; font-size: 12px;">
          <strong>Selected Location</strong><br/>
          <span>${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E</span>
        </div>`
      );
      if (selectable && onSelectCoordinates) {
        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          const newLat = Number(pos.lat.toFixed(6));
          const newLng = Number(pos.lng.toFixed(6));
          if (isValidCoordinatePair(newLat, newLng)) {
            onSelectCoordinates({ lat: newLat, lng: newLng });
          }
        });
      }
      marker.addTo(layerGroup);
    }
  }, [markers, center?.lat, center?.lng, selectable, showSingleMarker]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-emerald-200 shadow-sm bg-emerald-50">
      <div ref={mapContainerRef} style={{ height, width: '100%', zIndex: 1 }} />
      {selectable && (
        <div className="bg-emerald-900/95 text-emerald-50 text-xs px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <span>Click anywhere on the map or drag the marker to refine the exact location.</span>
          {hasValidCenter ? (
            <span className="font-mono text-amber-300">
              {Number(center.lat).toFixed(5)}° N, {Number(center.lng).toFixed(5)}° E
            </span>
          ) : (
            <span className="text-emerald-200 italic">No map point placed yet</span>
          )}
        </div>
      )}
    </div>
  );
}
