import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart, Eye, MousePointerClick, Trash2 } from "lucide-react";

interface AdAnalytic {
  id: string;
  imageUrl: string;
  status: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  totalInvestment?: number;
  dailyBid?: number;
  durationDays?: number;
}

export default function AdAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ads, setAds] = useState<AdAnalytic[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      const res = await fetch("/api/ads/analytics", {
         headers: {
            "Authorization": `Bearer ${token}`,
            "x-active-role": "marketer"
         }
      });
      
      if (!res.ok) throw new Error("Failed to load analytics");
      const data = await res.json();
      setAds(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to stop and delete this campaign? It will no longer run immediately.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/ads/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-active-role": "marketer"
        }
      });
      if (!res.ok) throw new Error("Failed to delete the ad");
      
      // Update state immediately
      setAds(prev => prev.filter(ad => ad.id !== id));
      alert("Campaign deleted successfully.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="neomorph-inset rounded-2xl p-6 text-center text-red-500 max-w-sm w-full">
          {error}
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 w-full bg-primary text-white py-2 rounded-xl neomorph-raised font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-main font-['Plus_Jakarta_Sans'] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-primary/20">
          <div className="flex items-center gap-4 w-full">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-3 bg-surface neomorph-raised hover:neomorph-inset rounded-full text-primary transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
               <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                 <BarChart className="w-8 h-8 text-primary" />
                 Ad Analytics Tracking
               </h1>
               <p className="text-sm font-medium text-muted">ROI and Campaign Stats</p>
            </div>
          </div>
        </div>

        {ads.length === 0 ? (
           <div className="neomorph-inset rounded-3xl p-12 text-center text-muted font-medium">
             No ads have been run yet. Ask the admin to upload a campaign!
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {ads.map((ad) => {
               const clickThroughRate = ad.impressions > 0 
                  ? ((ad.clicks / ad.impressions) * 100).toFixed(2) 
                  : "0.00";
                  
               return (
                 <div key={ad.id} className={`neomorph-raised rounded-3xl p-6 flex flex-col ${ad.status === 'active' ? 'border-2 border-primary' : ''}`}>
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${ad.status === 'active' ? 'bg-green-100 text-green-700' : ad.status === 'deleted' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                          {ad.status}
                        </span>
                        <p className="text-xs text-muted mt-2">{new Date(ad.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <div className="w-16 h-16 rounded-xl neomorph-inset overflow-hidden flex items-center justify-center">
                           {ad.imageUrl && ad.imageUrl.startsWith("data:") ? (
                             <img src={ad.imageUrl} alt="Ad content" className="w-full h-full object-cover" />
                           ) : (
                             <span className="text-xs text-muted">PDF/Media</span>
                           )}
                        </div>
                        {ad.status === 'active' && (
                          <button 
                            onClick={() => handleDelete(ad.id)}
                            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 font-bold uppercase"
                          >
                            <Trash2 className="w-3 h-3" /> Stop
                          </button>
                        )}
                      </div>
                   </div>

                   <div className="space-y-4 mb-4 flex-1">
                     <div className="neomorph-inset rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary font-bold">
                           <Eye className="w-5 h-5" /> Impressions
                        </div>
                        <span className="text-2xl font-extrabold">{ad.impressions}</span>
                     </div>
                     <div className="neomorph-inset rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary font-bold">
                           <MousePointerClick className="w-5 h-5" /> Clicks
                        </div>
                        <span className="text-2xl font-extrabold">{ad.clicks}</span>
                     </div>
                     {ad.totalInvestment !== undefined && (
                        <div className="neomorph-inset rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-tight">Total<br/>Pts</p>
                            <p className="font-extrabold text-sm">{ad.totalInvestment}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-tight">Daily<br/>Bid</p>
                            <p className="font-extrabold text-sm">{ad.dailyBid}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-tight">Run<br/>Days</p>
                            <p className="font-extrabold text-sm">{ad.durationDays}</p>
                          </div>
                        </div>
                     )}
                   </div>
                   
                   <div className="pt-4 border-t border-primary/20 flex justify-between items-center text-sm font-bold">
                      <span className="text-muted uppercase tracking-widest">CTR (Click-Through)</span>
                      <span className="text-xl text-primary">{clickThroughRate}%</span>
                   </div>
                 </div>
               );
             })}
           </div>
        )}
      </div>
    </div>
  );
}