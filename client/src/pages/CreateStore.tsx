import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ArrowLeft, MapPin, Clock, Copy, ToggleLeft, ToggleRight, Camera } from "lucide-react";
import MapLocationPicker from "../components/MapLocationPicker";
import { useGeolocation } from "../hooks/useGeolocation";

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

type WeekSchedule = Record<string, DaySchedule>;

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT: Record<string, string> = {
  Saturday: "Sat",
  Sunday: "Sun",
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

const DEFAULT_SCHEDULE: WeekSchedule = {
  Saturday: { enabled: true, open: "09:00", close: "21:00" },
  Sunday: { enabled: true, open: "09:00", close: "21:00" },
  Monday: { enabled: true, open: "09:00", close: "21:00" },
  Tuesday: { enabled: true, open: "09:00", close: "21:00" },
  Wednesday: { enabled: true, open: "09:00", close: "21:00" },
  Thursday: { enabled: true, open: "09:00", close: "21:00" },
  Friday: { enabled: false, open: "09:00", close: "21:00" },
};

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function serializeSchedule(schedule: WeekSchedule): string {
  // Group consecutive days with same hours
  const groups: { days: string[]; open: string; close: string; closed: boolean }[] = [];

  for (const day of DAYS) {
    const s = schedule[day];
    const last = groups[groups.length - 1];

    if (!s.enabled) {
      if (last && last.closed) {
        last.days.push(DAY_SHORT[day]);
      } else {
        groups.push({ days: [DAY_SHORT[day]], open: "", close: "", closed: true });
      }
    } else {
      if (last && !last.closed && last.open === s.open && last.close === s.close) {
        last.days.push(DAY_SHORT[day]);
      } else {
        groups.push({ days: [DAY_SHORT[day]], open: s.open, close: s.close, closed: false });
      }
    }
  }

  return groups
    .map((g) => {
      const dayRange =
        g.days.length > 2
          ? `${g.days[0]}-${g.days[g.days.length - 1]}`
          : g.days.join(", ");
      if (g.closed) return `${dayRange}: Closed`;
      return `${dayRange}: ${formatTime12h(g.open)} - ${formatTime12h(g.close)}`;
    })
    .join(" | ");
}

export default function CreateStore() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);

  const [storeImageFile, setStoreImageFile] = useState<File | null>(null);
  const [sImageBase64, setSImageBase64] = useState("");

  const [schedule, setSchedule] = useState<WeekSchedule>({ ...DEFAULT_SCHEDULE });

  const [formData, setFormData] = useState({
    name: "",
    ownerName: "",
    description: "",
    type: "general_store",
    location: {
      city: "",
      road: "",
      address: "",
      coordinates: [0, 0] as [number, number], // [lng, lat]
    }
  });

  const { location: geoLoc } = useGeolocation();

  useEffect(() => {
    if (geoLoc && formData.location.city === "") {
      // Fetch reverse geocode automatically using Nominatim
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${geoLoc.latitude}&lon=${geoLoc.longitude}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
            const road = addr.road || addr.suburb || addr.neighbourhood || '';
            const fullAddress = data.display_name || '';

            setFormData(prev => ({
              ...prev,
              location: {
                ...prev.location,
                city: city || prev.location.city,
                road: road || prev.location.road,
                address: fullAddress || prev.location.address,
                coordinates: [geoLoc.longitude, geoLoc.latitude]
              }
            }));
            setAddressAutoFilled(true);
          }
        })
        .catch(err => console.error("Auto geocode error:", err));
    }
  }, [geoLoc]);

  // Fade out auto-fill indicator after 4 seconds
  useEffect(() => {
    if (addressAutoFilled) {
      const timer = setTimeout(() => setAddressAutoFilled(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [addressAutoFilled]);

  const handleDayToggle = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const handleTimeChange = (day: string, field: "open" | "close", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const applyToAll = (sourceDay: string) => {
    const source = schedule[sourceDay];
    setSchedule((prev) => {
      const updated = { ...prev };
      for (const day of DAYS) {
        if (day !== sourceDay) {
          updated[day] = { ...source };
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!storeImageFile && !sImageBase64) {
      setError("Store image is required");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const payload = {
        ...formData,
        imageUrl: sImageBase64,
        operatingHours: serializeSchedule(schedule),
      };

      const res = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-active-role": "seller"
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create store");
      }

      navigate("/dashboard"); // Take them back so they see their store
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-main font-['Plus_Jakarta_Sans'] p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-primary hover:text-primary-dark font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-2xl neomorph-raised rounded-3xl p-8 md:p-10 bg-surface">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full neomorph-inset flex items-center justify-center text-primary mx-auto mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Create Your Store</h2>
          <p className="text-muted text-sm mt-2">Fill in your information to set up your digital storefront.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 neomorph-inset text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Store Cover Image Upload (Foodpanda style) */}
          <div className="flex flex-col mb-6 w-full">
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Store Cover Photo</label>
            <label className="w-full h-48 sm:h-56 rounded-2xl neomorph-inset flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-slate-300 hover:border-primary transition-colors relative group bg-surface">
              {sImageBase64 ? (
                <>
                  <img src={sImageBase64} alt="Store Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 text-white font-semibold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm shadow-xl">
                      <Camera className="w-5 h-5" />
                      <span>Change Cover</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover:text-primary transition-colors">
                  <Camera className="w-10 h-10 mb-3 opacity-80" />
                  <span className="text-sm font-bold">Upload a Cover Photo</span>
                  <span className="text-[10px] sm:text-xs mt-1 opacity-70">Recommended: Wide image (16:9 ratio)</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      alert("File size exceeds 2MB limit!");
                      return;
                    }
                    setStoreImageFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSImageBase64(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Store Name</label>
              <div className="neomorph-inset rounded-xl p-1">
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Super Mart" 
                  className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 outline-none text-sm font-medium" 
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Owner Name</label>
              <div className="neomorph-inset rounded-xl p-1">
                <input 
                  type="text" 
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="John Doe" 
                  className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 outline-none text-sm font-medium" 
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Short Description</label>
              <div className="neomorph-inset rounded-xl p-1">
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your store..." 
                  className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 outline-none text-sm font-medium resize-none h-20" 
                />
              </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Store Type</label>
                <div className="relative neomorph-inset rounded-xl p-1">
                  <select 
                    className="w-full appearance-none bg-transparent px-4 py-3 outline-none text-sm font-medium cursor-pointer"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="general_store">General Store</option>
                    <option value="pharmacy">Pharmacy</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary">
                    <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              OPERATING HOURS - Professional Day-by-Day Time Picker
              ═══════════════════════════════════════════════════════ */}
          <div className="pt-4 border-t border-slate-200/50">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-main">Operating Hours</h3>
            </div>

            <div className="space-y-2">
              {DAYS.map((day) => {
                const s = schedule[day];
                return (
                  <div
                    key={day}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                      s.enabled
                        ? "neomorph-inset bg-white/50"
                        : "bg-slate-100/60 opacity-70"
                    }`}
                  >
                    {/* Day name */}
                    <span className="w-[72px] text-xs font-bold uppercase tracking-widest text-main flex-shrink-0">
                      {DAY_SHORT[day]}
                    </span>

                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className="flex-shrink-0 transition-colors"
                      title={s.enabled ? "Mark as closed" : "Mark as open"}
                    >
                      {s.enabled ? (
                        <ToggleRight className="w-7 h-7 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-400" />
                      )}
                    </button>

                    {s.enabled ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="time"
                          value={s.open}
                          onChange={(e) => handleTimeChange(day, "open", e.target.value)}
                          className="w-[110px] bg-white border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-semibold text-main outline-none focus:border-primary transition-colors cursor-pointer"
                        />
                        <span className="text-xs text-muted font-bold">to</span>
                        <input
                          type="time"
                          value={s.close}
                          onChange={(e) => handleTimeChange(day, "close", e.target.value)}
                          className="w-[110px] bg-white border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-semibold text-main outline-none focus:border-primary transition-colors cursor-pointer"
                        />

                        {/* Apply to All button */}
                        <button
                          type="button"
                          onClick={() => applyToAll(day)}
                          className="ml-auto flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-lg transition-all"
                          title={`Apply ${DAY_SHORT[day]}'s hours to all days`}
                        >
                          <Copy className="w-3 h-3" />
                          <span className="hidden sm:inline">Apply All</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                        Closed
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Schedule Preview */}
            <div className="mt-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Preview</p>
              <p className="text-xs text-main font-medium leading-relaxed">
                {serializeSchedule(schedule)}
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════
              LOCATION DETAILS
              ═══════════════════════════════════ */}
          <div className="pt-4 border-t border-slate-200/50">
             <h3 className="text-sm font-bold text-main mb-4">Location Details</h3>
             
             <div className="mb-6">
               <button
                 type="button"
                 onClick={() => setMapOpen(true)}
                 className="w-full flex items-center justify-center gap-3 py-4 rounded-xl neomorph-raised bg-primary/5 hover:bg-primary/10 text-primary font-semibold transition-all active:neomorph-inset border-2 border-primary/20"
               >
                 <MapPin className="w-5 h-5" />
                 Set Location from Map
               </button>
               {formData.location.coordinates[0] !== 0 && formData.location.coordinates[1] !== 0 && (
                 <div className="mt-3 p-3 rounded-xl bg-green-50 neomorph-inset flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-600"></div>
                   <p className="text-xs text-green-700 font-semibold">
                     Location set: {formData.location.coordinates[1].toFixed(4)}°N, {formData.location.coordinates[0].toFixed(4)}°E
                   </p>
                 </div>
               )}
               {/* Auto-fill indicator */}
               {addressAutoFilled && (
                 <div className="mt-2 flex items-center gap-2 animate-pulse">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                   <p className="text-[11px] text-emerald-600 font-semibold">
                     Address fields auto-filled from map — you can edit them below
                   </p>
                 </div>
               )}
             </div>

             <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">City</label>
                  <div className="neomorph-inset rounded-xl p-1">
                    <input 
                      type="text" 
                      value={formData.location.city}
                      onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                      placeholder="e.g. Dhaka"
                      className="w-full bg-transparent border-none px-4 py-3 outline-none text-sm font-medium" 
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Road/Street</label>
                  <div className="neomorph-inset rounded-xl p-1">
                    <input 
                      type="text" 
                      value={formData.location.road}
                      onChange={(e) => setFormData({ ...formData, location: { ...formData.location, road: e.target.value } })}
                      placeholder="e.g. Mirpur Road"
                      className="w-full bg-transparent border-none px-4 py-3 outline-none text-sm font-medium" 
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Full Address / Landmark</label>
                  <div className="neomorph-inset rounded-xl p-1">
                    <textarea 
                      value={formData.location.address}
                      onChange={(e) => setFormData({ ...formData, location: { ...formData.location, address: e.target.value } })}
                      placeholder="e.g. House 12, Block C, Mirpur-10, Dhaka 1216"
                      className="w-full bg-transparent border-none px-4 py-3 outline-none text-sm font-medium resize-none h-24" 
                      required
                    />
                  </div>
                </div>
             </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-primary text-white font-bold py-4 rounded-xl neomorph-raised active:neomorph-inset transition-all disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Store"}
          </button>
        </form>
      </div>

      <MapLocationPicker
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelectLocation={(data) => {
          setFormData((prev) => ({
            ...prev,
            location: {
              city: data.city || prev.location.city,
              road: data.road || prev.location.road,
              address: data.address || prev.location.address,
              coordinates: [data.longitude, data.latitude],
            }
          }));
          if (data.city || data.road || data.address) {
            setAddressAutoFilled(true);
          }
        }}
      />
    </div>
  );
}
