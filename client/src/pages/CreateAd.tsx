import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Megaphone, Upload, CheckCircle, Coins } from "lucide-react";

export default function CreateAd() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [adPoints, setAdPoints] = useState<number>(0);
  const [totalInvestment, setTotalInvestment] = useState<number>(100);
  const [dailyBid, setDailyBid] = useState<number>(10);
  const [durationDays, setDurationDays] = useState<number>(7);

  useEffect(() => {
    fetchUserPoints();
  }, []);

  const fetchUserPoints = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAdPoints(data.adPoints || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFile = (file: File) => {
    setError(null);
    setSuccess(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) return;
    if (totalInvestment < dailyBid * durationDays) {
      setError(`Total investment (${totalInvestment}) must be at least ${dailyBid * durationDays} for the selected bid and duration.`);
      return;
    }
    if (totalInvestment > adPoints) {
      setError(`Insufficient Ad Points. You have ${adPoints} points but trying to invest ${totalInvestment}.`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-active-role": "marketer",
        },
        body: JSON.stringify({ 
          imageUrl: preview,
          totalInvestment,
          dailyBid,
          durationDays
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload ad");
      }
      setSuccess(true);
      setPreview(null);
      setFileName("");
      
      // Refresh points
      fetchUserPoints();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-main font-['Plus_Jakarta_Sans'] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-primary/20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-3 bg-surface neomorph-raised hover:neomorph-inset rounded-full text-primary transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                <Megaphone className="w-8 h-8 text-primary" />
                Launch a Campaign
              </h1>
              <p className="text-sm font-medium text-muted">
                Upload promotional content. It will fade-in for users browsing the marketplace.
              </p>
            </div>
          </div>
          <div className="neomorph-inset px-5 py-3 rounded-2xl flex items-center gap-3 ml-12 sm:ml-0">
            <Coins className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted font-bold">Your Balance</p>
              <p className="text-xl font-extrabold text-main">{adPoints} <span className="text-sm font-medium text-muted">Pts</span></p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl neomorph-inset text-red-500 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl neomorph-inset text-green-600 text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Ad is now live on the marketplace.
          </div>
        )}

        <div className="neomorph-raised rounded-3xl p-8 space-y-6">
          <label className="block">
            <div className="neomorph-inset rounded-2xl p-8 text-center cursor-pointer hover:opacity-90 transition-opacity">
              <Upload className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="font-bold text-main">
                {fileName || "Click to choose an image or PDF"}
              </p>
              <p className="text-xs text-muted mt-1">PNG, JPG, GIF or PDF</p>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </label>

          {preview && (
            <div className="neomorph-inset rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted mb-3">
                Preview
              </p>
              {preview.startsWith("data:application/pdf") ? (
                <iframe src={preview} className="w-full h-[50vh] rounded-xl border-none" />
              ) : (
                <img
                  src={preview}
                  alt="Ad preview"
                  className="w-full max-h-[50vh] object-contain rounded-xl"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase tracking-widest pl-1">Total Investment</label>
              <div className="neomorph-inset p-2 rounded-2xl">
                <input 
                  type="number" 
                  min="1"
                  value={totalInvestment}
                  onChange={(e) => setTotalInvestment(Number(e.target.value))}
                  className="w-full bg-transparent border-none outline-none focus:ring-0 px-4 py-2 font-bold text-main"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase tracking-widest pl-1">Daily Bid</label>
              <div className="neomorph-inset p-2 rounded-2xl">
                <input 
                  type="number" 
                  min="1"
                  value={dailyBid}
                  onChange={(e) => setDailyBid(Number(e.target.value))}
                  className="w-full bg-transparent border-none outline-none focus:ring-0 px-4 py-2 font-bold text-main"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase tracking-widest pl-1">Duration (Days)</label>
              <div className="neomorph-inset p-2 rounded-2xl">
                <input 
                  type="number" 
                  min="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full bg-transparent border-none outline-none focus:ring-0 px-4 py-2 font-bold text-main"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-2">
             <div className="text-sm font-bold text-muted">
                Minimum required investment: <span className="text-primary">{dailyBid * durationDays} pts</span>
             </div>
             <div className="text-sm font-bold text-muted">
                Remaining points: <span className={adPoints - totalInvestment < 0 ? "text-red-500" : "text-green-500"}>
                  {adPoints - totalInvestment} pts
                </span>
             </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!preview || uploading || (totalInvestment > adPoints) || (totalInvestment < dailyBid * durationDays)}
            className="w-full py-4 rounded-xl bg-primary text-white font-extrabold text-lg neomorph-raised hover:opacity-90 active:neomorph-inset transition-all shadow-[0_10px_20px_rgba(23,178,110,0.3)] disabled:opacity-50 disabled:shadow-none"
          >
            {uploading ? "Publishing..." : "Launch Ad Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
