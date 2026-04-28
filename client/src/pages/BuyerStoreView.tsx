import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Store, Star } from "lucide-react";

interface Product {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stockQuantity: number; // Required for display
  isOutOfStock: boolean;
}

export default function BuyerStoreView() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    fetchStoreAndProducts();
    fetchCartSummary();
  }, [storeId]);

  const fetchCartSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`/api/cart/summary`, {
        headers: { "Authorization": `Bearer ${token}`, "x-active-role": "buyer" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
           setCartItemCount(data.items.reduce((acc: number, item: any) => acc + item.qty, 0));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = async (productId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setAddingProductId(productId);
    try {
      const res = await fetch(`/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-active-role": "buyer",
        },
        body: JSON.stringify({ productId, qty: 1 }),
      });

      if (!res.ok) throw new Error("Failed to add to cart");
      
      const data = await res.json();
      if (data.items) {
        setCartItemCount(data.items.reduce((acc: number, item: any) => acc + item.qty, 0));
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingProductId(null);
    }
  };

  const fetchStoreAndProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/stores/${storeId}`, {
        headers: { Authorization: `Bearer ${token}`, "x-active-role": "buyer" },
      });

      if (!res.ok) throw new Error("Failed to load store data");

      const data = await res.json();
      setStore(data.store);
      // Ensure we handle ID mapping if backend returns _id
      const formattedProducts = data.products.map((p: any) => ({
        ...p,
        id: p._id || p.id,
      }));
      setProducts(formattedProducts);
      setReviews(data.reviews || []);
      setAvgRating(data.avgRating || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center font-bold text-primary">Loading storefront...</div>;
  if (error || !store) return <div className="min-h-screen bg-surface flex items-center justify-center font-bold text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-surface text-main font-['Plus_Jakarta_Sans'] p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-300">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-3 bg-surface neomorph-raised hover:neomorph-inset active:neomorph-inset transition-all rounded-full text-primary">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <div>
                <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                   {store.name} 
                   <span className="text-[0.65rem] font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full align-middle">
                     {store.type?.replace('_', ' ')}
                   </span>
                </h1>
                <p className="text-muted font-medium text-sm mt-1 flex items-center gap-1">
                   <Store className="w-4 h-4 text-slate-400 flex-shrink-0" />
                   <span>{store.location?.road}, {store.location?.city}</span>
                   {reviews.length > 0 && (
                        <span className="flex items-center gap-1 ml-3 text-orange-500 font-bold bg-orange-500/10 px-2 py-0.5 rounded-lg text-xs tracking-wide">
                           <Star className="w-3 h-3 fill-current mb-0.5" />
                         {avgRating.toFixed(1)} ({reviews.length})
                      </span>
                   )}
                </p>
             </div>
          </div>
               <div className="flex items-center gap-4">
                  <button
                     onClick={() => navigate("/buyer/cart")}
                     className="relative px-4 py-2 rounded-xl neomorph-raised active:neomorph-inset transition-all font-semibold flex items-center gap-2 text-primary"
                  >
                     <ShoppingCart className="w-4 h-4" />
                     <span>Cart</span>
                     {cartItemCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                           {cartItemCount}
                        </span>
                     )}
                  </button>
                  <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Store Owner</p>
                      <p className="font-semibold text-lg">{store.ownerName}</p>
                  </div>
               </div>
        </div>

        {/* Products Grid */}
        <h3 className="text-xl font-bold mb-6 tracking-tight">Available Goods ({products.length})</h3>
        
        {products.length === 0 ? (
           <div className="neomorph-inset rounded-3xl p-12 text-center text-muted font-medium">
              This store hasn't added any products yet.
           </div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map(p => {
                 // Determine stock status
                 const isOOS = p.isOutOfStock || p.stockQuantity <= 0;
                 const isLowStock = !isOOS && p.stockQuantity < 5;

                 return (
                 <div key={p.id} className={`neomorph-raised rounded-2xl p-4 flex flex-col group transition-all bg-surface ${isOOS ? 'opacity-80' : 'hover:-translate-y-1'}`}>
                    
                    {/* Image Container */}
                    <div className="neomorph-inset rounded-xl p-2 mb-4 h-48 flex items-center justify-center overflow-hidden bg-white relative">
                       <img 
                         src={p.imageUrl} 
                         alt={p.name} 
                         className={`max-h-full object-contain mix-blend-multiply transition-transform duration-300 ${!isOOS && 'group-hover:scale-110'}`} 
                       />
                       
                       {isOOS && (
                         <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                           <span className="bg-red-600 text-white font-black text-xs px-3 py-2 rounded-lg transform -rotate-12 border-2 border-white shadow-xl tracking-tighter">
                             SOLD OUT
                           </span>
                         </div>
                       )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 space-y-2">
                       <div className="flex justify-between items-start">
                          <h4 className="font-bold text-lg leading-tight text-main line-clamp-1">{p.name}</h4>
                       </div>
                       <p className="text-xs text-muted line-clamp-2 min-h-[2rem]">{p.description}</p>
                       
                       {/* ✅ Stock Indicator Display */}
                       <div className="flex items-center gap-2 pt-1">
                          {isOOS ? (
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Out of Stock</span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                              isLowStock 
                                ? 'bg-orange-50 text-orange-600 border-orange-200' 
                                : 'bg-green-50 text-green-600 border-green-200'
                            }`}>
                              {isLowStock ? `ONLY ${p.stockQuantity} LEFT` : `${p.stockQuantity} IN STOCK`}
                            </span>
                          )}
                       </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Price</p>
                          <div className="text-xl font-black text-primary">TK {p.price.toFixed(0)}</div>
                       </div>
                       
                       <button
                          onClick={() => addToCart(p.id)}
                          disabled={addingProductId === p.id || isOOS}
                          className={`w-12 h-12 flex items-center justify-center text-white rounded-xl transition-all shadow-lg ${
                            isOOS 
                              ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                              : 'bg-primary hover:shadow-primary/40 active:scale-90'
                          }`}
                          title={isOOS ? "Unavailable" : "Add to Cart"}
                        >
                          {addingProductId === p.id ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : isOOS ? (
                            <ShoppingCart className="w-5 h-5 opacity-40" />
                          ) : (
                            <ShoppingCart className="w-5 h-5" />
                          )}
                       </button>
                    </div>
                 </div>
                 )
              })}
           </div>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
           <div className="mt-12 pt-8 border-t border-slate-300">
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Customer Reviews</h2>
              <div className="space-y-4">
                 {reviews.map((r: any) => (
                    <div key={r._id} className="p-4 rounded-2xl bg-surface neomorph-inset">
                       <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-primary">{r.buyerId?.name || "Anonymous"}</span>
                          <div className="flex gap-1">
                             {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-orange-500 text-orange-500' : 'text-slate-300'}`} />
                             ))}
                          </div>
                       </div>
                       <p className="text-muted text-sm italic">"{r.comment}"</p>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}