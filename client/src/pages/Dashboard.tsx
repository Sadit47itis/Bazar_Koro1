import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Plus, ShoppingBag, Store, TrendingUp, User, Shield, Truck, Star, Megaphone } from "lucide-react";
import { SellerOMS } from '../components/SellerOMS';

type UserRole = "buyer" | "seller" | "driver" | "marketer" | "admin";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  activeRole: UserRole;
}

interface UserStore {
  id: string;
  _id?: string;
  name: string;
  ownerName: string;
  type: string;
  location: { city: string; road: string; address: string };
  status?: string;
  isActive?: boolean;
  avgRating?: number;
  reviewCount?: number;
}

interface BuyerOrderLine {
  productId: string;
  storeId: string;
  name: string;
  unitPrice: number;
  qty: number;
}

interface BuyerOrder {
  _id: string;
  status: 'placed' | 'paid' | 'accepted' | 'rejected' | 'ready_for_pickup' | 'claimed' | 'at_store' | 'picked_up' | 'on_the_way' | 'delivered';
  lines: BuyerOrderLine[];
  delivery?: {
    deliveryPin?: string;
  };
  createdAt: string;
  review?: { rating: number, comment: string } | null;
}

interface DriverOrderLine {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
}

interface DriverOrder {
  _id: string;
  status: 'placed' | 'accepted' | 'rejected' | 'ready_for_pickup' | 'claimed' | 'at_store' | 'picked_up' | 'on_the_way' | 'delivered';
  lines: DriverOrderLine[];
  delivery?: {
    deliveryPin?: string;
  };
  createdAt: string;
  storeInfo?: {
    id: string;
    name: string;
    location?: { city: string; road: string };
    road?: string;
    city?: string;
  };
  distanceKm?: number;
  dropOffDistanceKm?: number;
  deliveryFee?: number;
}

interface DriverOverview {
  isOnline: boolean;
  dailyEarnings: number;
  driverDailyGoal?: number;
  completedTrips: number;
  activeDeliveries: DriverOrder[];
  availableOrders: DriverOrder[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  // --- CORE STATE ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // --- BUYER & SELLER STATE ---
  const [stores, setStores] = useState<UserStore[]>([]);
  const [buyerOrders, setBuyerOrders] = useState<BuyerOrder[]>([]);
  const [, setReviewModalOpen] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<{ orderId: string, storeId: string, productId?: string, title: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // --- DRIVER STATE ---
  const [driverOverview, setDriverOverview] = useState<DriverOverview | null>(null);
  const [driverGoalInput, setDriverGoalInput] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [driverPinInputs, setDriverPinInputs] = useState<Record<string, string>>({});

  // --- MARKETER STATE ---
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCampaignProduct, setSelectedCampaignProduct] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [budget, setBudget] = useState(10);
  const [duration, setDuration] = useState(7);
  const [selectedAffiliateProduct, setSelectedAffiliateProduct] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoEmails, setPromoEmails] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [selectedRole]);

  // Auto-refresh driver overview every 30 seconds when online
  useEffect(() => {
    if (selectedRole !== 'driver' || !driverOverview?.isOnline) return;

    const interval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const res = await fetch('/api/driver/overview', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-active-role': 'driver'
          }
        });
        if (res.ok) {
          setDriverOverview(await res.json());
        }
      } catch (err) {
        console.error('Failed to refresh driver overview:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedRole, driverOverview?.isOnline]);

  // Request geolocation permission and update location periodically
  useEffect(() => {
    if (selectedRole !== 'driver') return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateDriverLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('Geolocation permission denied or error:', error.message);
        }
      );

      let watchId: number | null = null;
      if (driverOverview?.isOnline) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            updateDriverLocation(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.log('Geolocation watch error:', error);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }

      return () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    }
  }, [selectedRole, driverOverview?.isOnline]);

  const updateDriverLocation = async (latitude: number, longitude: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch('/api/driver/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'driver'
        },
        body: JSON.stringify({ latitude, longitude })
      });
    } catch (err) {
      console.error('Failed to update driver location:', err);
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`
      };
      
      if (selectedRole) {
        headers["x-active-role"] = selectedRole;
      }

      const response = await fetch("/api/me", { headers });
      
      if (response.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      setUser(data);

      const resolvedRole = selectedRole || data.activeRole;
      if (!selectedRole) setSelectedRole(resolvedRole);

      if (resolvedRole === "seller") {
        const storeRes = await fetch("/api/stores", { headers: { "Authorization": `Bearer ${token}`, "x-active-role": "seller" } });
        if (storeRes.ok) {
          setStores(await storeRes.json());
        }
      }

      if (resolvedRole === "buyer") {
        const [storeRes, orderRes] = await Promise.all([
          fetch("/api/stores/all", { headers: { "Authorization": `Bearer ${token}`, "x-active-role": "buyer" } }),
          fetch("/api/orders/me", { headers: { "Authorization": `Bearer ${token}`, "x-active-role": "buyer" } }),
        ]);

        if (storeRes.ok) setStores(await storeRes.json());
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setBuyerOrders(orderData.orders || []);
        }
      }

      if (resolvedRole === "driver") {
        const driverRes = await fetch("/api/driver/overview", { headers: { "Authorization": `Bearer ${token}`, "x-active-role": "driver" } });
        if (driverRes.ok) {
          const data = await driverRes.json();
          setDriverOverview(data);
          setDriverGoalInput(data.driverDailyGoal?.toString() || '');
        }
      }

      if (resolvedRole === "marketer") {
        try {
          const storeRes = await fetch("/api/stores", { 
            headers: { "Authorization": `Bearer ${token}`, "x-active-role": "seller" } 
          });
          
          if (storeRes.ok) {
            const myStores = await storeRes.json();
            let allMyProducts: any[] = [];
            
            for (const store of myStores) {
              const prodRes = await fetch(`/api/products/store/${store.id}`, { 
                headers: { "Authorization": `Bearer ${token}` } 
              });
              
              if (prodRes.ok) {
                const storeProducts = await prodRes.json();
                
                let productsArray = [];
                if (Array.isArray(storeProducts)) productsArray = storeProducts;
                else if (storeProducts && Array.isArray(storeProducts.items)) productsArray = storeProducts.items;
                else if (storeProducts && Array.isArray(storeProducts.products)) productsArray = storeProducts.products;
                else if (storeProducts && Array.isArray(storeProducts.data)) productsArray = storeProducts.data;
                
                allMyProducts = [...allMyProducts, ...productsArray];
              }
            }
            setProducts(allMyProducts);
          }
        } catch (err) {
          console.error("Failed to load marketer products", err);
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // @ts-ignore
  const _handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReview) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-active-role": "buyer"
        },
        body: JSON.stringify({
          orderId: selectedOrderForReview.orderId,
          storeId: selectedOrderForReview.storeId,
          productId: selectedOrderForReview.productId || undefined,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }
      
      setBuyerOrders(prev => prev.map(o => o._id === selectedOrderForReview.orderId ? { ...o, review: { rating: reviewRating, comment: reviewComment } } : o));

      alert("Review submitted successfully!");
      setReviewModalOpen(false);
      setSelectedOrderForReview(null);
      setReviewRating(5);
      setReviewComment("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    if (!user) return;
    
    setLoading(true);
    if (user.roles.includes(newRole)) {
      setSelectedRole(newRole);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/me/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) throw new Error("Failed to add role");
      
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSelectedRole(newRole);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // --- MARKETER ACTIONS ---
  const handleStartCampaign = async () => {
    if (!selectedCampaignProduct) return alert("Please select a product to promote!");
    setCampaignLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/payment/create-campaign-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-active-role": "marketer"
        },
        body: JSON.stringify({ 
          productId: selectedCampaignProduct, 
          budget, 
          durationDays: duration 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      window.location.href = data.url; 
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleGenerateLink = () => {
    if (!selectedAffiliateProduct) return alert("Please select a product first!");
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/product/${selectedAffiliateProduct}?ref=${user?.id}`;
    setAffiliateLink(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(affiliateLink);
    alert("Affiliate link copied to clipboard!");
  };

  const handleSendPromoEmail = async () => {
    const emails = promoEmails.split('\n').map(email => email.trim()).filter(email => email);
    
    if (emails.length === 0) {
      alert('Please enter at least one email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      alert(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    setPromoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/newsletter/test", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-active-role": "marketer"
        },
        body: JSON.stringify({
          emails: emails,
          neighborhood: "Custom Promo"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send promo email");
      }

      alert(`Promo email sent successfully to ${emails.length} recipient(s)!`);
      setShowPromoModal(false);
      setPromoEmails('');
    } catch (err: any) {
      alert("Error sending promo email: " + err.message);
    } finally {
      setPromoLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="neomorph-inset rounded-2xl p-6 text-center text-red-500 max-w-sm w-full">
          {error || "Failed to load dashboard"}
          <button 
            onClick={() => navigate("/login")}
            className="mt-4 w-full bg-primary text-white py-2 rounded-xl neomorph-raised active:neomorph-inset transition-all font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const RoleIcon = () => {
    switch (user.activeRole) {
      case "buyer": return <ShoppingBag className="w-6 h-6" />;
      case "seller": return <Store className="w-6 h-6" />;
      case "driver": return <Truck className="w-6 h-6" />;
      case "marketer": return <TrendingUp className="w-6 h-6" />;
      case "admin": return <Shield className="w-6 h-6" />;
      default: return <User className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-surface text-main font-['Plus_Jakarta_Sans']">
      <nav className="p-6">
        <div className="neomorph-raised rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full neomorph-inset flex items-center justify-center text-primary">
              <RoleIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Welcome, {user.name}</h1>
              <p className="text-sm font-medium text-muted capitalize">{user.activeRole} Mode</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <select 
                className="w-full sm:w-auto appearance-none bg-transparent neomorph-inset rounded-xl px-4 py-2.5 pr-8 font-semibold text-sm outline-none cursor-pointer text-main"
                value={user.activeRole}
                onChange={handleRoleChange}
              >
                <option value="buyer">Buyer Mode</option>
                <option value="seller">Seller Mode</option>
                <option value="driver">Driver Mode</option>
                <option value="marketer">Marketer Mode</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            {user.activeRole === "marketer" && (
              <button
                onClick={() => navigate("/marketer/create-ad")}
                title="Create Ad Campaign"
                className="flex items-center justify-center w-11 h-11 rounded-xl neomorph-raised active:neomorph-inset transition-all text-primary"
              >
                <Megaphone className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl neomorph-raised active:neomorph-inset transition-all font-semibold text-red-500 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="px-6 pb-10 max-w-6xl mx-auto">
        {/* BUYER SECTION */}
        {user.activeRole === "buyer" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold tracking-tight mb-4">Discover Local Stores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.length === 0 ? (
                <div className="neomorph-inset rounded-3xl p-8 flex items-center justify-center min-h-[40vh] text-muted col-span-full">
                  No stores are currently available in your area. Check back later!
                </div>
              ) : (
                stores.map((s) => (
                  <Link to={`/buyer/stores/${s.id}`} key={s.id} className="neomorph-raised hover:neomorph-inset active:neomorph-inset rounded-3xl p-6 flex flex-col justify-center min-h-[12rem] space-y-2 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Store className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-bold text-xl leading-tight text-main line-clamp-1">{s.name}</h3>
                         <div className="flex items-center gap-2 mt-1">
                           <span className="text-[0.65rem] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">{s.type.replace('_', ' ')}</span>
                           {s.avgRating ? (
                             <span className="text-[0.65rem] font-bold text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                               <Star className="w-3 h-3 fill-current" />
                               {s.avgRating.toFixed(1)}
                             </span>
                           ) : null}
                         </div>
                       </div>
                    </div>
                    <p className="text-sm font-medium text-muted mt-auto">By {s.ownerName}</p>
                    <p className="text-xs text-slate-500 truncate">{s.location.road}, {s.location.city}</p>
                  </Link>
                ))
              )}
            </div>

            <div className="space-y-6 mt-12">
              <h2 className="text-2xl font-extrabold tracking-tight">Your Orders</h2>
              {buyerOrders.length === 0 ? (
                <div className="neomorph-inset rounded-3xl p-8 text-center text-muted">
                  No orders have been placed yet. Your pending orders will appear here.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {buyerOrders.map((order) => (
                    <div key={order._id} className="neomorph-raised rounded-3xl p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <p className="text-sm font-bold text-main">Order #{order._id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="inline-flex flex-col items-end gap-2">
                          <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                            {order.status.replace(/_/g, ' ')}
                          </div>
                          {order.status === 'delivered' && (
                              !order.review ? (
                              <button
                                onClick={() => {
                                   setSelectedOrderForReview({ orderId: order._id, storeId: order.lines?.[0]?.storeId || '', title: "Review Store & Products" });
                                   setReviewModalOpen(true);
                                }}
                                  className="text-xs bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-transform hover:bg-orange-500/20"
                                >
                                  <Star className="w-3 h-3 fill-current" /> Leave Review
                                </button>
                                ) : (
                                  <div className="text-xs bg-orange-500 text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-orange-500/20">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className={`w-3 h-3 ${i < order.review!.rating ? 'fill-current text-white' : 'text-orange-200'}`} />
                                  ))}
                                </div>
                              )
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.lines.map((line) => (
                          <div key={line.productId} className="flex justify-between text-sm text-main">
                            <span>{line.qty}x {line.name}</span>
                            <span>৳{(line.unitPrice * line.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      {order.delivery?.deliveryPin && order.status !== 'delivered' && order.status !== 'rejected' && (
                        <div className="mt-4 pt-4 border-t border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <Shield className="w-4 h-4 text-primary" />
                            Share this PIN with your driver at handoff:
                          </div>
                          <div className="px-4 py-2 bg-primary/10 text-primary font-mono font-bold tracking-widest rounded-xl text-lg text-center">
                            {order.delivery.deliveryPin}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SELLER SECTION */}
        {user.activeRole === "seller" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-extrabold tracking-tight">Seller Hub</h2>
              <button 
                onClick={() => navigate("/seller/create-store")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white neomorph-raised active:neomorph-inset transition-all font-semibold shadow-inner"
              >
                <Plus className="w-5 h-5" />
                <span>Create Store</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.length === 0 ? (
                <div className="neomorph-raised rounded-3xl p-6 flex flex-col items-center justify-center min-h-[12rem] text-center space-y-3 col-span-full">
                  <Store className="w-8 h-8 text-primary" />
                  <h3 className="font-bold text-lg">Your Shops</h3>
                  <p className="text-sm text-muted">You haven't set up any stores yet. Click 'Create Store' to get started!</p>
                </div>
              ) : (
                stores.map((s) => (
                  <div key={s.id} className="neomorph-raised rounded-3xl p-6 flex flex-col justify-center min-h-[12rem] space-y-2 group">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Store className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-bold text-xl leading-tight text-main line-clamp-1">{s.name}</h3>
                         <div className="flex flex-wrap gap-2 items-center mt-1">
                           <span className="text-[0.65rem] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">{s.type.replace('_', ' ')}</span>
                         </div>
                       </div>
                    </div>
                    <p className="text-sm font-medium text-muted mt-auto">By {s.ownerName}</p>
                    <p className="text-xs text-slate-500 truncate mb-4">{s.location.road}, {s.location.city}</p>
                    
                    <button 
                      onClick={() => navigate(`/seller/stores/${s.id}`)}
                      className="w-full mt-2 py-2.5 rounded-xl bg-primary text-white font-semibold neomorph-raised active:neomorph-inset transition-all flex items-center justify-center gap-2"
                    >
                      <span>Manage Store</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {stores.length > 0 && (
              <div className="mt-12 space-y-8">
                <h2 className="text-2xl font-extrabold tracking-tight border-t border-primary/20 pt-8">Incoming Orders</h2>
                {stores.map(store => (
                  <div key={store.id} className="space-y-4">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" /> 
                      {store.name}
                    </h3>
                    <SellerOMS storeId={store.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DRIVER SECTION */}
        {user.activeRole === "driver" && driverOverview && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="neomorph-raised rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted">Availability</p>
                    <p className="text-2xl font-extrabold text-main">{driverOverview.isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      const res = await fetch('/api/driver/status', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                          'x-active-role': 'driver',
                        },
                        body: JSON.stringify({ online: !driverOverview.isOnline }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setDriverOverview((prev) => prev ? { ...prev, isOnline: data.isOnline } : prev);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl font-semibold neomorph-raised active:neomorph-inset transition-all ${driverOverview.isOnline ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                  >
                    {driverOverview.isOnline ? 'Go Offline' : 'Go Online'}
                  </button>
                </div>
                <p className="text-sm text-muted">Toggle your availability to accept deliveries when you are ready to work.</p>
              </div>

              <div className="neomorph-raised rounded-3xl p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted">Daily Earnings</p>
                <p className="text-3xl font-extrabold text-primary">৳{driverOverview.dailyEarnings.toFixed(2)}</p>
              </div>

              <div className="neomorph-raised rounded-3xl p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted">Completed Trips</p>
                <p className="text-3xl font-extrabold text-primary">{driverOverview.completedTrips}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="neomorph-raised rounded-3xl p-6">
                <h2 className="text-xl font-bold mb-4">Active Deliveries</h2>
                {driverOverview.activeDeliveries.length === 0 ? (
                  <div className="text-sm text-muted">No active deliveries right now.</div>
                ) : (
                  <div className="space-y-4">
                    {driverOverview.activeDeliveries.map((order) => {
                      const nextAction = order.status === 'claimed'
                        ? { label: 'Arrived at Store', nextStatus: 'at_store' }
                        : order.status === 'at_store'
                        ? { label: 'Picked Up', nextStatus: 'picked_up' }
                        : order.status === 'picked_up'
                        ? { label: 'On the Way', nextStatus: 'on_the_way' }
                        : order.status === 'on_the_way'
                        ? { label: 'Mark Delivered', nextStatus: 'delivered' }
                        : null;

                      return (
                        <div key={order._id} className="border border-primary/10 rounded-3xl p-4 neomorph-inset">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                              <p className="font-semibold text-main">Order #{order._id.slice(-6).toUpperCase()}</p>
                              <p className="text-xs text-muted">{order.status.replace(/_/g, ' ')}</p>
                            </div>
                            {nextAction && (
                              <button
                                onClick={async () => {
                                  const token = localStorage.getItem('token');
                                  if (!token) return;
                                  const res = await fetch(`/api/orders/${order._id}/status`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`,
                                      'x-active-role': 'driver'
                                    },
                                    body: JSON.stringify({ status: nextAction.nextStatus })
                                  });
                                  if (res.ok) {
                                    fetchUserData(); 
                                  }
                                }}
                                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                              >
                                {nextAction.label}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MARKETER SECTION */}
        {user.activeRole === "marketer" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-extrabold tracking-tight">Marketer Dashboard</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPromoModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white neomorph-raised active:neomorph-inset transition-all font-semibold shadow-inner"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>Send Promo Email</span>
                </button>
                <button 
                  onClick={() => navigate('/marketer/analytics')}
                  className="px-6 py-3 rounded-xl text-primary font-bold neomorph-raised hover:neomorph-inset transition-all"
                >
                  View Analytics
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ad Campaigns */}
              <div className="neomorph-raised rounded-3xl p-6 space-y-4">
                <h3 className="text-xl font-bold">Start a Sponsored Campaign</h3>
                <div>
                  <label className="text-sm text-muted">Select Product to Promote</label>
                  <select 
                    className="w-full mt-1 neomorph-inset rounded-xl px-4 py-2 bg-transparent outline-none"
                    value={selectedCampaignProduct}
                    onChange={(e) => setSelectedCampaignProduct(e.target.value)}
                  >
                    <option value="">-- Choose a product --</option>
                    {products.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted">Budget (৳)</label>
                    <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full mt-1 neomorph-inset rounded-xl px-4 py-2 bg-transparent outline-none" />
                  </div>
                  <div>
                    <label className="text-sm text-muted">Duration (Days)</label>
                    <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full mt-1 neomorph-inset rounded-xl px-4 py-2 bg-transparent outline-none" />
                  </div>
                </div>
                <button 
                  onClick={handleStartCampaign} 
                  disabled={campaignLoading}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold neomorph-raised active:neomorph-inset transition-all"
                >
                  {campaignLoading ? "Processing..." : "Launch Campaign"}
                </button>
              </div>

              {/* Affiliate Links */}
              <div className="neomorph-raised rounded-3xl p-6 space-y-4">
                <h3 className="text-xl font-bold">Generate Affiliate Link</h3>
                <div>
                  <label className="text-sm text-muted">Select Product to Share</label>
                  <select 
                    className="w-full mt-1 neomorph-inset rounded-xl px-4 py-2 bg-transparent outline-none"
                    value={selectedAffiliateProduct}
                    onChange={(e) => setSelectedAffiliateProduct(e.target.value)}
                  >
                    <option value="">-- Choose a product --</option>
                    {products.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={handleGenerateLink}
                  className="w-full py-3 rounded-xl bg-surface text-primary font-semibold border-2 border-primary neomorph-raised active:neomorph-inset transition-all"
                >
                  Generate Link
                </button>
                {affiliateLink && (
                  <div className="mt-4 p-4 neomorph-inset rounded-xl flex items-center justify-between gap-2 overflow-hidden">
                    <span className="text-sm truncate text-muted">{affiliateLink}</span>
                    <button onClick={copyToClipboard} className="text-primary font-bold text-sm px-3 py-1 bg-primary/10 rounded-lg whitespace-nowrap hover:bg-primary/20">Copy</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ADMIN SECTION */}
        {user.activeRole === "admin" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold tracking-tight mb-4">Admin Dashboard</h2>
            <div className="neomorph-inset rounded-3xl p-6 text-muted text-sm">
              Use the Admin Operations panel at <button onClick={() => navigate("/admin")} className="text-primary font-bold underline">/admin</button> to manage stores and accounts.
            </div>
          </div>
        )}
      </main>

      {/* Promo Email Modal */}
      {showPromoModal && user.activeRole === "marketer" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-primary">Send Promo Email</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-main">
                  Email Addresses (one per line)
                </label>
                <textarea
                  value={promoEmails}
                  onChange={(e) => setPromoEmails(e.target.value)}
                  placeholder="customer1@example.com&#10;customer2@example.com&#10;customer3@example.com"
                  className="w-full h-32 p-3 rounded-xl neomorph-inset resize-none outline-none text-main"
                  disabled={promoLoading}
                />
                <p className="text-xs text-muted mt-1">
                  Enter one email address per line. We'll send promotional content to these addresses.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPromoModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl neomorph-raised active:neomorph-inset transition-all font-semibold text-muted"
                  disabled={promoLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendPromoEmail}
                  disabled={promoLoading}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-white neomorph-raised active:neomorph-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {promoLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Email'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}