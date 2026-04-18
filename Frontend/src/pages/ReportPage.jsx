import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { incidentAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  MapPin, AlertTriangle, Send, ShieldAlert, Eye, EyeOff,
  ChevronDown, Loader2, CheckCircle, Info
} from 'lucide-react';

const CATEGORIES = [
  { value: 'harassment', label: 'Harassment', icon: '🗣️' },
  { value: 'stalking', label: 'Stalking', icon: '👁️' },
  { value: 'assault', label: 'Assault', icon: '⚠️' },
  { value: 'theft', label: 'Theft / Snatching', icon: '💰' },
  { value: 'eve_teasing', label: 'Eve Teasing', icon: '😤' },
  { value: 'unsafe_area', label: 'Unsafe Area', icon: '🚧' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'high', label: 'High', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
];

const MUMBAI_AREAS = [
  'Colaba', 'Churchgate', 'Marine Lines', 'Grant Road', 'Mumbai Central',
  'Dadar', 'Bandra', 'Andheri', 'Borivali', 'Malad', 'Goregaon',
  'Jogeshwari', 'Kurla', 'Ghatkopar', 'Mulund', 'Thane', 'Powai',
  'Vikhroli', 'Chembur', 'Vile Parle', 'Santacruz', 'Dharavi',
  'Worli', 'Lower Parel', 'Juhu',
];

export default function ReportPage() {
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    category: '',
    severity: 'medium',
    description: '',
    areaName: '',
    isAnonymous: true,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleChange('latitude', pos.coords.latitude.toFixed(6));
        handleChange('longitude', pos.coords.longitude.toFixed(6));
        setUseCurrentLocation(true);
        setGettingLocation(false);
        toast.success('Location detected');
      },
      () => {
        toast.error('Unable to get location. Please enter manually.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Initialize mini map for location picking
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [72.8777, 19.0760],
          zoom: 11,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          handleChange('latitude', lat.toFixed(6));
          handleChange('longitude', lng.toFixed(6));

          if (markerRef.current) markerRef.current.remove();
          markerRef.current = new mapboxgl.Marker({ color: '#a855f7' })
            .setLngLat([lng, lat])
            .addTo(map);
        });

        mapRef.current = map;
      } catch (e) {
        console.warn('Mini map failed to load:', e);
      }
    };

    initMap();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.latitude || !form.longitude) {
      toast.error('Please set a location');
      return;
    }
    if (!form.category) {
      toast.error('Please select a category');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setLoading(true);
    try {
      await incidentAPI.report(form);
      setSubmitted(true);
      toast.success('Incident reported successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit report.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen pt-16 px-4">
        <div className="glass-card p-12 max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white mb-3">Report Submitted</h2>
          <p className="text-dark-400 mb-6">
            Thank you for reporting. Your report will be reviewed by moderators before appearing on the map.
          </p>
          <button onClick={() => { setSubmitted(false); setForm({ latitude: '', longitude: '', category: '', severity: 'medium', description: '', areaName: '', isAnonymous: true }); }} className="btn-primary">
            Report Another Incident
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display text-white mb-2">Report an Incident</h1>
          <p className="text-dark-400 max-w-lg mx-auto">
            Help make Mumbai safer. Your report will be reviewed and added to our safety intelligence system.
          </p>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 mb-8 bg-primary-600/10 border border-primary-500/20 rounded-xl animate-slide-up">
          <Info className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-dark-300">
            <p className="font-medium text-primary-300 mb-1">Your privacy is protected</p>
            <p>Reports can be submitted anonymously. Your identity is never exposed publicly.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
          {/* Location Section */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-400" />
              Location
            </h2>

            {/* Mini Map */}
            <div ref={mapContainer} className="w-full h-64 rounded-xl mb-4 border border-dark-700/50 overflow-hidden" />
            <p className="text-xs text-dark-500 mb-4">Click on the map to set the incident location</p>

            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="btn-secondary !py-2 text-sm flex items-center gap-2"
              >
                {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Use My Location
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => handleChange('latitude', e.target.value)}
                  placeholder="19.0760"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-text">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => handleChange('longitude', e.target.value)}
                  placeholder="72.8777"
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="label-text">Area Name</label>
              <select
                value={form.areaName}
                onChange={(e) => handleChange('areaName', e.target.value)}
                className="input-field"
              >
                <option value="">Select Area (Optional)</option>
                {MUMBAI_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Incident Details */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Incident Details
            </h2>

            {/* Category */}
            <div className="mb-4">
              <label className="label-text">Category *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange('category', value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      form.category === value
                        ? 'bg-primary-600/20 border-primary-500/50 text-primary-300'
                        : 'bg-dark-800/50 border-dark-700/50 text-dark-300 hover:border-dark-600'
                    }`}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="mb-4">
              <label className="label-text">Severity Level</label>
              <div className="flex gap-3">
                {SEVERITIES.map(({ value, label, color, bg }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange('severity', value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      form.severity === value ? bg + ' ' + color : 'bg-dark-800/50 border-dark-700/50 text-dark-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label-text">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what happened... (Max 1000 characters)"
                className="input-field min-h-[120px] resize-y"
                maxLength={1000}
                required
              />
              <p className="text-xs text-dark-500 mt-1">{form.description.length}/1000 characters</p>
            </div>
          </div>

          {/* Privacy */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              {form.isAnonymous ? <EyeOff className="w-5 h-5 text-primary-400" /> : <Eye className="w-5 h-5 text-primary-400" />}
              Privacy Settings
            </h2>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(e) => handleChange('isAnonymous', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${form.isAnonymous ? 'bg-primary-600' : 'bg-dark-600'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${form.isAnonymous ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Report Anonymously</p>
                <p className="text-xs text-dark-400">Your identity will not be linked to this report</p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-4 text-lg"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
