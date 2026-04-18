import { useState, useEffect, useRef, useCallback } from 'react';
import { mapAPI, incidentAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import TimeFilter from '../components/Map/TimeFilter';
import toast from 'react-hot-toast';
import {
  Shield, MapPin, AlertTriangle, Phone, Navigation,
  Layers, Eye, EyeOff, Activity, TrendingDown, TrendingUp
} from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const MUMBAI_CENTER = [72.8777, 19.0760];

const RISK_COLORS = {
  safe: '#22c55e',
  moderate: '#f59e0b',
  high_risk: '#ef4444',
};

export default function HomePage() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [timeRange, setTimeRange] = useState('month');
  const [areas, setAreas] = useState(null);
  const [policeStations, setPoliceStations] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPolice, setShowPolice] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [selectedArea, setSelectedArea] = useState(null);
  const [stats, setStats] = useState({ safe: 0, moderate: 0, high_risk: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [areasRes, stationsRes, heatmapRes] = await Promise.all([
        mapAPI.getAreas({ timeRange }),
        mapAPI.getPoliceStations(),
        incidentAPI.getHeatmap({ timeRange }),
      ]);

      setAreas(areasRes.data.data);
      setPoliceStations(stationsRes.data.data);
      setHeatmapData(heatmapRes.data.data);

      // Calculate stats
      const features = areasRes.data.data.features || [];
      const s = { safe: 0, moderate: 0, high_risk: 0, total: features.length };
      features.forEach((f) => {
        if (f.properties.riskLevel === 'safe') s.safe++;
        else if (f.properties.riskLevel === 'moderate') s.moderate++;
        else s.high_risk++;
      });
      setStats(s);
    } catch (err) {
      console.error('Failed to fetch map data:', err);
      // Use mock data if API fails
      setAreas(getMockAreas());
      setPoliceStations(getMockPoliceStations());
      setHeatmapData({ points: getMockHeatmap(), total: 50 });
      setStats({ safe: 10, moderate: 9, high_risk: 6, total: 25 });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: MUMBAI_CENTER,
          zoom: 11.5,
          pitch: 30,
          bearing: 0,
          antialias: true,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
          }),
          'top-right'
        );

        map.on('load', () => {
          setMapLoaded(true);
          mapRef.current = map;
        });

        map.on('error', (e) => {
          console.warn('Mapbox error, using fallback view:', e);
          setMapLoaded(true);
          mapRef.current = map;
        });
      } catch (err) {
        console.error('Map init error:', err);
        setMapLoaded(true);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map layers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const updateLayers = () => {
      // Remove existing layers/sources
      ['area-fills', 'area-outlines', 'area-labels', 'heatmap-layer', 'police-markers'].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      ['areas-source', 'heatmap-source', 'police-source'].forEach((id) => {
        if (map.getSource(id)) map.removeSource(id);
      });

      // Add area zones
      if (areas && showZones) {
        map.addSource('areas-source', { type: 'geojson', data: areas });

        map.addLayer({
          id: 'area-fills',
          type: 'fill',
          source: 'areas-source',
          paint: {
            'fill-color': [
              'match', ['get', 'riskLevel'],
              'safe', RISK_COLORS.safe,
              'moderate', RISK_COLORS.moderate,
              'high_risk', RISK_COLORS.high_risk,
              '#6b7280'
            ],
            'fill-opacity': 0.25,
          },
        });

        map.addLayer({
          id: 'area-outlines',
          type: 'line',
          source: 'areas-source',
          paint: {
            'line-color': [
              'match', ['get', 'riskLevel'],
              'safe', RISK_COLORS.safe,
              'moderate', RISK_COLORS.moderate,
              'high_risk', RISK_COLORS.high_risk,
              '#6b7280'
            ],
            'line-width': 2,
            'line-opacity': 0.7,
          },
        });

        map.addLayer({
          id: 'area-labels',
          type: 'symbol',
          source: 'areas-source',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-anchor': 'center',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#e2e8f0',
            'text-halo-color': '#0f172a',
            'text-halo-width': 2,
          },
        });

        // Click handler for areas
        map.on('click', 'area-fills', (e) => {
          if (e.features.length > 0) {
            const props = e.features[0].properties;
            setSelectedArea(props);
          }
        });

        map.on('mouseenter', 'area-fills', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'area-fills', () => {
          map.getCanvas().style.cursor = '';
        });
      }

      // Add heatmap
      if (heatmapData && showHeatmap) {
        const heatGeoJSON = {
          type: 'FeatureCollection',
          features: (heatmapData.points || []).map((p) => ({
            type: 'Feature',
            properties: { weight: p.weight },
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          })),
        };

        map.addSource('heatmap-source', { type: 'geojson', data: heatGeoJSON });

        map.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'heatmap-source',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': 1,
            'heatmap-radius': 30,
            'heatmap-opacity': 0.6,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.2, 'rgba(103,58,183,0.4)',
              0.4, 'rgba(156,39,176,0.6)',
              0.6, 'rgba(244,67,54,0.7)',
              0.8, 'rgba(255,152,0,0.8)',
              1, 'rgba(255,235,59,0.9)'
            ],
          },
        });
      }

      // Add police stations
      if (policeStations && showPolice) {
        map.addSource('police-source', { type: 'geojson', data: policeStations });

        map.addLayer({
          id: 'police-markers',
          type: 'circle',
          source: 'police-source',
          paint: {
            'circle-radius': 7,
            'circle-color': '#3b82f6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });

        map.on('click', 'police-markers', (e) => {
          if (e.features.length > 0) {
            const props = e.features[0].properties;
            const coords = e.features[0].geometry.coordinates.slice();

            const mapboxgl = require('mapbox-gl');
            new mapboxgl.Popup({ offset: 15, className: 'custom-popup' })
              .setLngLat(coords)
              .setHTML(`
                <div style="font-family: Inter, sans-serif;">
                  <h3 style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #f1f5f9;">🚔 ${props.name}</h3>
                  <p style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">📍 ${props.address}</p>
                  <p style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">📞 ${props.phone || 'N/A'}</p>
                  ${props.isWomenCell === 'true' ? '<span style="background: rgba(236,72,153,0.2); color: #f472b6; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">Women Safety Cell</span>' : ''}
                </div>
              `)
              .addTo(map);
          }
        });

        map.on('mouseenter', 'police-markers', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'police-markers', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    };

    try { updateLayers(); } catch (e) { console.warn('Layer update error:', e); }
  }, [mapLoaded, areas, policeStations, heatmapData, showHeatmap, showPolice, showZones]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const handleNewIncident = () => {
      toast('New incident reported nearby', { icon: '⚠️' });
      fetchData();
    };
    const handleAreaUpdate = (data) => {
      if (data) setAreas({ type: 'FeatureCollection', features: data.map(a => ({
        type: 'Feature', properties: { name: a.name, safetyScore: a.safetyScore, riskLevel: a.riskLevel, incidentCount: a.incidentCount || 0 }, geometry: a.geometry
      }))});
    };
    socket.on('new-incident', handleNewIncident);
    socket.on('area-update', handleAreaUpdate);
    return () => {
      socket.off('new-incident', handleNewIncident);
      socket.off('area-update', handleAreaUpdate);
    };
  }, [socket, fetchData]);

  return (
    <div className="page-container pt-16">
      {/* Stats Bar */}
      <div className="bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-safety-safe animate-pulse" />
                <span className="text-sm text-dark-300">Safe: <span className="font-semibold text-emerald-400">{stats.safe}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-safety-moderate animate-pulse" />
                <span className="text-sm text-dark-300">Moderate: <span className="font-semibold text-amber-400">{stats.moderate}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-safety-danger animate-pulse" />
                <span className="text-sm text-dark-300">High Risk: <span className="font-semibold text-red-400">{stats.high_risk}</span></span>
              </div>
            </div>

            <TimeFilter timeRange={timeRange} onChange={setTimeRange} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Map */}
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Map loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-dark-950/60 flex items-center justify-center z-10">
            <div className="glass-card p-8 text-center">
              <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-300">Loading safety data...</p>
            </div>
          </div>
        )}

        {/* Map fallback if no Mapbox */}
        {!mapRef.current && mapLoaded && (
          <div className="absolute inset-0 bg-dark-900 flex items-center justify-center">
            <div className="text-center glass-card p-12 max-w-md">
              <MapPin className="w-16 h-16 text-primary-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Map Loading</h2>
              <p className="text-dark-400 text-sm">
                The interactive map requires a valid Mapbox token. Configure it in the environment settings.
                Safety data is still available below.
              </p>
            </div>
          </div>
        )}

        {/* Layer Controls */}
        <div className="absolute top-4 left-4 z-10 space-y-2">
          <div className="glass-card p-3 space-y-2">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Layers</p>
            {[
              { key: 'zones', label: 'Safety Zones', state: showZones, setter: setShowZones, color: 'text-primary-400' },
              { key: 'heatmap', label: 'Heatmap', state: showHeatmap, setter: setShowHeatmap, color: 'text-orange-400' },
              { key: 'police', label: 'Police Stations', state: showPolice, setter: setShowPolice, color: 'text-blue-400' },
            ].map(({ key, label, state, setter, color }) => (
              <button
                key={key}
                onClick={() => setter(!state)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  state ? 'bg-dark-700/80 text-white' : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                {state ? <Eye className={`w-3.5 h-3.5 ${color}`} /> : <EyeOff className="w-3.5 h-3.5" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Area Panel */}
        {selectedArea && (
          <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-10 animate-slide-up">
            <div className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedArea.name}</h3>
                  <span className={`inline-block mt-1 ${
                    selectedArea.riskLevel === 'safe' ? 'badge-safe' :
                    selectedArea.riskLevel === 'moderate' ? 'badge-moderate' : 'badge-danger'
                  }`}>
                    {selectedArea.riskLevel === 'safe' ? '✓ Safe Zone' :
                     selectedArea.riskLevel === 'moderate' ? '⚠ Moderate Risk' : '✗ High Risk'}
                  </span>
                </div>
                <button onClick={() => setSelectedArea(null)} className="text-dark-400 hover:text-white p-1">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-dark-800/60 rounded-lg p-3">
                  <p className="text-xs text-dark-400 mb-1">Safety Score</p>
                  <p className={`text-2xl font-bold ${
                    selectedArea.safetyScore >= 70 ? 'text-emerald-400' :
                    selectedArea.safetyScore >= 40 ? 'text-amber-400' : 'text-red-400'
                  }`}>{selectedArea.safetyScore}/100</p>
                </div>
                <div className="bg-dark-800/60 rounded-lg p-3">
                  <p className="text-xs text-dark-400 mb-1">Incidents</p>
                  <p className="text-2xl font-bold text-dark-200">{selectedArea.incidentCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 right-4 z-10 hidden sm:block">
          <div className="glass-card p-4">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Legend</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded bg-safety-safe/60 border border-safety-safe" />
                <span className="text-xs text-dark-300">Safe (Score ≥ 70)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded bg-safety-moderate/60 border border-safety-moderate" />
                <span className="text-xs text-dark-300">Moderate (40-69)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded bg-safety-danger/60 border border-safety-danger" />
                <span className="text-xs text-dark-300">High Risk (&lt; 40)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-full bg-blue-500 border-2 border-white" />
                <span className="text-xs text-dark-300">Police Station</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock data for when API is unavailable
function getMockAreas() {
  const areas = [
    { name: 'Colaba', center: [72.8326, 18.9067], risk: 'safe', score: 82 },
    { name: 'Churchgate', center: [72.8272, 18.9322], risk: 'safe', score: 78 },
    { name: 'Marine Lines', center: [72.8235, 18.9432], risk: 'moderate', score: 55 },
    { name: 'Grant Road', center: [72.8150, 18.9600], risk: 'high_risk', score: 32 },
    { name: 'Mumbai Central', center: [72.8194, 18.9690], risk: 'moderate', score: 48 },
    { name: 'Dadar', center: [72.8438, 19.0178], risk: 'high_risk', score: 28 },
    { name: 'Bandra', center: [72.8370, 19.0596], risk: 'moderate', score: 58 },
    { name: 'Andheri', center: [72.8497, 19.1197], risk: 'high_risk', score: 25 },
    { name: 'Borivali', center: [72.8567, 19.2307], risk: 'safe', score: 75 },
    { name: 'Malad', center: [72.8490, 19.1860], risk: 'moderate', score: 52 },
    { name: 'Goregaon', center: [72.8494, 19.1663], risk: 'moderate', score: 45 },
    { name: 'Jogeshwari', center: [72.8490, 19.1360], risk: 'high_risk', score: 35 },
    { name: 'Kurla', center: [72.8796, 19.0726], risk: 'high_risk', score: 30 },
    { name: 'Ghatkopar', center: [72.9080, 19.0868], risk: 'moderate', score: 50 },
    { name: 'Mulund', center: [72.9560, 19.1726], risk: 'safe', score: 72 },
    { name: 'Thane', center: [72.9781, 19.2183], risk: 'moderate', score: 55 },
    { name: 'Powai', center: [72.9052, 19.1176], risk: 'safe', score: 80 },
    { name: 'Vikhroli', center: [72.9296, 19.1110], risk: 'moderate', score: 48 },
    { name: 'Chembur', center: [72.8970, 19.0522], risk: 'moderate', score: 52 },
    { name: 'Vile Parle', center: [72.8479, 19.0963], risk: 'safe', score: 70 },
    { name: 'Santacruz', center: [72.8402, 19.0830], risk: 'safe', score: 73 },
    { name: 'Dharavi', center: [72.8553, 19.0430], risk: 'high_risk', score: 22 },
    { name: 'Worli', center: [72.8183, 19.0000], risk: 'safe', score: 76 },
    { name: 'Lower Parel', center: [72.8272, 18.9927], risk: 'safe', score: 74 },
    { name: 'Juhu', center: [72.8296, 19.1075], risk: 'safe', score: 78 },
  ];

  return {
    type: 'FeatureCollection',
    features: areas.map((a) => ({
      type: 'Feature',
      properties: { name: a.name, safetyScore: a.score, riskLevel: a.risk, incidentCount: Math.floor(Math.random() * 30) },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [a.center[0] - 0.012, a.center[1] - 0.010],
          [a.center[0] + 0.012, a.center[1] - 0.010],
          [a.center[0] + 0.012, a.center[1] + 0.010],
          [a.center[0] - 0.012, a.center[1] + 0.010],
          [a.center[0] - 0.012, a.center[1] - 0.010],
        ]],
      },
    })),
  };
}

function getMockPoliceStations() {
  const stations = [
    { name: 'Colaba Police Station', address: 'Shahid Bhagat Singh Rd', phone: '022-22821855', coords: [72.8326, 18.9067] },
    { name: 'Bandra Police Station', address: 'Hill Road, Bandra West', phone: '022-26415959', coords: [72.8370, 19.0596] },
    { name: 'Andheri Police Station', address: 'SV Road, Andheri West', phone: '022-26282626', coords: [72.8497, 19.1197] },
    { name: 'Dadar Police Station', address: 'LJ Road, Dadar West', phone: '022-24376811', coords: [72.8438, 19.0178] },
    { name: 'Kurla Police Station', address: 'LBS Marg, Kurla West', phone: '022-26502222', coords: [72.8796, 19.0726] },
    { name: 'Powai Police Station', address: 'Hiranandani Gardens', phone: '022-25709400', coords: [72.9052, 19.1176] },
    { name: 'Borivali Police Station', address: 'SV Road, Borivali West', phone: '022-28932121', coords: [72.8567, 19.2307] },
    { name: 'Malad Police Station', address: 'SV Road, Malad West', phone: '022-28820100', coords: [72.8490, 19.1860] },
  ];

  return {
    type: 'FeatureCollection',
    features: stations.map((s) => ({
      type: 'Feature',
      properties: { name: s.name, address: s.address, phone: s.phone, isWomenCell: false },
      geometry: { type: 'Point', coordinates: s.coords },
    })),
  };
}

function getMockHeatmap() {
  const points = [];
  const centers = [
    [72.8497, 19.1197], [72.8796, 19.0726], [72.8553, 19.0430],
    [72.8438, 19.0178], [72.8150, 18.9600], [72.8490, 19.1360],
  ];
  centers.forEach((c) => {
    for (let i = 0; i < 10; i++) {
      points.push({
        lng: c[0] + (Math.random() - 0.5) * 0.02,
        lat: c[1] + (Math.random() - 0.5) * 0.02,
        weight: Math.ceil(Math.random() * 3),
      });
    }
  });
  return points;
}
