// client/src/components/ProductList.tsx
import type { Product } from '../types/search';
import { Link } from 'react-router-dom';

interface ProductListProps {
  products: Product[];
  loading: boolean;
}

export function ProductList({ products, loading }: ProductListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-[#707d40] text-lg font-semibold">Searching local stores...</div>
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-[#646657] neomorph-inset rounded-2xl p-8 mt-8">
        No products found. Try adjusting your filters or increasing your search radius.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {products.map((product) => (
        <div key={product._id} className="rounded-2xl neomorph-raised p-5 bg-[#e8eaf0] transition hover:-translate-y-1 flex flex-col relative">
          
          {/* ✅ SPONSORED BADGE */}
          {(product as any).isCurrentlyPromoted && (
            <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              Sponsored
            </div>
          )}
          
          {/* --- ADDED IMAGE CONTAINER --- */}
          <div className="w-full h-48 mb-4 rounded-xl overflow-hidden neomorph-inset bg-[#d9dbe0]">
            <img 
              src={product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'} 
              alt={product.name} 
              className="w-full h-full object-cover mix-blend-multiply"
              loading="lazy"
            />
          </div>
          {/* ----------------------------- */}

          <div className="flex-grow">
            <h3 className="text-xl font-bold text-[#37392d]">{product.name}</h3>
            <p className="text-sm text-[#646657] mt-1 line-clamp-2">{product.description}</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-2xl font-extrabold text-[#707d40]">৳{product.price}</span>
              <span className="text-xs bg-[#707d40]/20 px-2 py-1 rounded-full text-[#37392d] font-medium">
                {product.category}
              </span>
            </div>
            {product.distance !== undefined && (
              <p className="text-xs text-[#646657] mt-3 font-medium">
                {(product.distance / 1000).toFixed(1)} km away
              </p>
            )}
          </div>
          
          <Link 
            to={`/product/${product._id}`} 
            className="block text-center w-full mt-4 py-3 rounded-xl neomorph-raised neomorph-active text-[#707d40] font-bold text-sm tracking-wide"
          >
            View Details
          </Link>
        </div>
      ))}
    </div>
  );
}