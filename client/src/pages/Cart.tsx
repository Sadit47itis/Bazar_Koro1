import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, Ticket, X } from "lucide-react";

// --- Interfaces ---
interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  imageUrl?: string;
}

interface CartGroup {
  storeId: string;
  storeName: string;
  items: CartItem[];
  subtotal: number;
}

interface CartSummary {
  items: CartItem[];
  grouped: CartGroup[];
  subtotal: number;
  deliveryCharge: number;
  platformFee?: number;
  total: number;
}

export default function Cart() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // --- NEW COUPON STATES ---
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    void fetchSummary();
  }, [token, navigate]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart/summary", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-active-role": "buyer",
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!res.ok) throw new Error("Failed to load cart");
      setSummary((await res.json()) as CartSummary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- COUPON VALIDATION LOGIC ---
  const applyCoupon = async () => {
    if (!couponCode.trim() || !summary) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          code: couponCode.toUpperCase(), 
          subtotal: summary.subtotal 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid coupon");

      setAppliedCoupon({
        code: couponCode.toUpperCase(),
        discount: data.discountAmount,
      });
      setCouponCode("");
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Calculate final totals based on applied coupon
  const finalTotal = useMemo(() => {
    const baseTotal = summary?.total ?? 0;
    const discount = appliedCoupon?.discount ?? 0;
    return Math.max(0, baseTotal - discount);
  }, [summary, appliedCoupon]);

  const updateQty = async (productId: string, nextQty: number) => {
    if (!token) return;
    setBusyProductId(productId);
    try {
      const res = await fetch("/api/cart/update-qty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-active-role": "buyer",
        },
        body: JSON.stringify({ productId, qty: nextQty }),
      });
      if (!res.ok) throw new Error("Failed to update quantity");
      setSummary((await res.json()) as CartSummary);
      // Remove coupon if cart changes (forces re-validation)
      setAppliedCoupon(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyProductId(null);
    }
  };

  const removeItem = async (productId: string) => {
    if (!token) return;
    setBusyProductId(productId);
    try {
      const res = await fetch("/api/cart/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-active-role": "buyer",
        },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("Failed to remove item");
      setSummary((await res.json()) as CartSummary);
      setAppliedCoupon(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyProductId(null);
    }
  };

  const handleCheckout = async () => {
    // 1. Validation check
    if (!summary || summary.items.length === 0) {
      alert("Your cart is empty.");
      return;
    }
    
    setIsCheckingOut(true);

    try {
      const res = await fetch("/api/payment/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-active-role": "buyer",
        },
        body: JSON.stringify({
          // Mapping the items to include the IDs the backend needs
          items: summary.items.map((item) => ({
            productId: item.productId, // Essential for DB verification
            name: item.name,
            price: item.unitPrice,
            quantity: item.qty,
          })),
          couponCode: appliedCoupon?.code || null,
        }),
      });

      const data = await res.json();

      // 2. Enhanced Error Handling
      if (!res.ok) {
        // Log the full response to the console for debugging
        console.error("Backend Error Response:", data);
        throw new Error(data.error || data.message || `Server Error (${res.status})`);
      }

      // 3. Redirect to Stripe
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("The server didn't return a checkout URL.");
      }
    } catch (err: any) {
      console.error("Checkout process failed:", err);
      // Alerts the specific error message from the backend
      alert(`Checkout Failed: ${err.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center">Loading...</div>;

  const groups = summary?.grouped ?? [];
  const isEmpty = (summary?.items?.length ?? 0) === 0;

  return (
    <div className="min-h-screen bg-surface text-main font-['Plus_Jakarta_Sans'] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-300">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="p-3 bg-surface neomorph-raised hover:neomorph-inset active:neomorph-inset transition-all rounded-full text-primary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Your Cart</h1>
              <p className="text-sm font-medium text-muted">Items are grouped by store</p>
            </div>
          </div>
        </div>

        {isEmpty ? (
          <div className="neomorph-inset rounded-3xl p-12 text-center text-muted font-medium">Your cart is empty.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-6">
              {groups.map((g) => (
                <div key={g.storeId} className="neomorph-raised rounded-3xl p-6">
                   <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight">{g.storeName ?? "Store"}</h2>
                      <p className="text-xs font-semibold text-slate-500">{g.items.length} item(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Store Subtotal</p>
                      <p className="text-lg font-extrabold text-primary">TK {g.subtotal.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {g.items.map((item) => {
                      const isBusy = busyProductId === item.productId;
                      return (
                        <div key={item.productId} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 neomorph-inset rounded-2xl p-4">
                          <div className="w-full sm:w-20 h-20 neomorph-inset rounded-xl overflow-hidden bg-white flex items-center justify-center">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                              <div className="text-xs text-slate-400">No image</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="font-bold text-base truncate">{item.name}</h3>
                                <p className="text-xs text-muted font-medium">TK {item.unitPrice.toFixed(2)} each</p>
                              </div>
                              <button
                                onClick={() => removeItem(item.productId)}
                                disabled={isBusy}
                                className="p-2 rounded-xl neomorph-raised active:neomorph-inset transition-all text-red-500 disabled:opacity-60"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => updateQty(item.productId, Math.max(0, item.qty - 1))}
                                  disabled={isBusy}
                                  className="p-2 rounded-xl neomorph-raised active:neomorph-inset transition-all"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <div className="min-w-[2.5rem] text-center font-extrabold">{item.qty}</div>
                                <button
                                  onClick={() => updateQty(item.productId, item.qty + 1)}
                                  disabled={isBusy}
                                  className="p-2 rounded-xl neomorph-raised active:neomorph-inset transition-all"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Line Total</p>
                                <p className="text-base font-extrabold">TK {(item.unitPrice * item.qty).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
              <div className="neomorph-raised rounded-3xl p-6 h-fit">
                <h2 className="text-xl font-extrabold tracking-tight mb-6">Order Summary</h2>
                
                {/* --- COUPON SECTION --- */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Have a Promo Code?</p>
                  {!appliedCoupon ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. LOCAL10"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="flex-1 bg-surface neomorph-inset rounded-xl px-4 py-2 text-sm font-bold uppercase placeholder:lowercase outline-none"
                        />
                        <button
                          onClick={applyCoupon}
                          disabled={isValidatingCoupon || !couponCode}
                          className="p-3 bg-primary text-white rounded-xl neomorph-raised active:neomorph-inset transition-all disabled:opacity-50"
                        >
                          <Ticket className="w-4 h-4" />
                        </button>
                      </div>
                      {couponError && <p className="text-[10px] font-bold text-red-500 px-1">{couponError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-black text-green-700">{appliedCoupon.code}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-green-700 hover:scale-110 transition-transform">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-muted">Subtotal</span>
                    <span>TK {(summary?.subtotal ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-muted">Delivery</span>
                    <span>TK {(summary?.deliveryCharge ?? 0).toFixed(2)}</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-sm font-bold text-green-600">
                      <span>Discount</span>
                      <span>- TK {appliedCoupon.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total</span>
                    <span className="text-2xl font-extrabold text-primary">TK {finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut || isEmpty}
                  className="mt-8 w-full bg-primary text-white py-4 rounded-xl neomorph-raised hover:neomorph-inset active:neomorph-inset transition-all font-extrabold text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCheckingOut ? "Connecting..." : "Checkout Now"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}