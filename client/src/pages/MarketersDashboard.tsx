import { useState, useEffect } from "react";
import { Target, DollarSign, Calendar } from "lucide-react";

export default function MarketerDashboard() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [budget, setBudget] = useState(1000);
  const [duration, setDuration] = useState(7);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch products that marketers can promote
    fetch("/api/search")
      .then((res) => res.json())
      .then((data) => setProducts(data.items || []))
      .catch((err) => console.error("Failed to load products", err));
  }, []);

  const handleStartCampaign = async () => {
    if (!selectedProduct) return alert("Please select a product!");
    setLoading(true);

    try {
      const token = localStorage.getItem("token"); // Adjust based on your auth state
      const res = await fetch("/api/payment/create-campaign-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-active-role": "marketer" // Ensure the backend knows we are acting as a marketer
        },
        body: JSON.stringify({ 
          productId: selectedProduct, 
          budget, 
          durationDays: duration 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Redirect to Stripe
      window.location.href = data.url; 
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen p-8 text-main font-['Plus_Jakarta_Sans']">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="neomorph-raised rounded-[2rem] p-8">
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <Target className="text-primary" /> Marketer Dashboard
          </h1>
          <p className="text-muted">Select a product, set your budget, and start earning commissions.</p>

          <div className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Select Product to Promote</label>
              <select 
                className="w-full bg-surface neomorph-inset rounded-xl p-4 outline-none font-bold"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">Choose a product...</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} - TK {p.price}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Total Budget (TK)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-4 w-5 h-5 text-primary" />
                  <input 
                    type="number" 
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full bg-surface neomorph-inset rounded-xl p-4 pl-12 font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Duration (Days)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-4 w-5 h-5 text-primary" />
                  <input 
                    type="number" 
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-surface neomorph-inset rounded-xl p-4 pl-12 font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="neomorph-inset rounded-2xl p-6 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Total Cost</p>
                <p className="text-2xl font-black text-primary">TK {budget}</p>
              </div>
              <button 
                onClick={handleStartCampaign}
                disabled={loading}
                className="bg-primary text-white px-8 py-4 rounded-xl font-extrabold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Pay & Launch"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}