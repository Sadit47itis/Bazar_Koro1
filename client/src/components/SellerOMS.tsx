import { useState, useEffect } from 'react';

interface OrderLine {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

interface Order {
  _id: string; // MongoDB ID
  status: 'placed' | 'paid' | 'accepted' | 'rejected' | 'ready_for_pickup' | 'claimed' | 'at_store' | 'picked_up' | 'on_the_way' | 'delivered';
  lines: OrderLine[];
  createdAt: string;
}

export function SellerOMS({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/store/${storeId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'x-active-role': 'seller'
      }
    })
      .then(res => res.json())
      .then(data => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(err => console.error("Error fetching orders:", err));
  }, [storeId]);

  const updateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-active-role': 'seller'
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (response.ok) {
        setOrders(orders.map(order => 
          order._id === orderId ? { ...order, status: nextStatus as any } : order
        ));
      } else {
        const errData = await response.json();
        alert(`Failed to update: ${errData.error}`);
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center animate-pulse font-bold text-primary">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="neomorph-inset rounded-2xl p-6 text-center text-muted text-sm">
        No orders yet. Waiting for buyers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => {
        const orderTotal = order.lines.reduce((sum, line) => sum + (line.unitPrice * line.qty), 0);

        return (
          <div key={order._id} className="p-6 rounded-2xl neomorph-inset">
            <div className="flex justify-between items-start border-b border-primary/10 pb-4 mb-4">
              <div>
                <p className="text-sm font-bold text-main">Order #{order._id.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold neomorph-raised text-primary uppercase tracking-wider">
                {order.status.replace(/_/g, ' ')}
              </div>
            </div>

            <div className="mb-6">
              <ul className="space-y-2">
                {order.lines.map((line, idx) => (
                  <li key={idx} className="flex justify-between font-medium text-sm text-main">
                    <span>{line.qty}x {line.name}</span>
                    <span>৳{line.unitPrice * line.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-primary/10 flex justify-between font-bold text-main">
                <span>Total</span>
                <span className="text-primary">৳{orderTotal}</span>
              </div>
            </div>

            {/* Seller Actions */}
            <div className="flex gap-4">
              {(order.status === 'placed' || order.status === 'paid') && (
                <>
                  <button
                    onClick={() => updateStatus(order._id, 'accepted')}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold neomorph-raised active:neomorph-inset transition-all"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => updateStatus(order._id, 'rejected')}
                    className="flex-1 py-2.5 rounded-xl text-red-500 font-bold neomorph-raised active:neomorph-inset transition-all"
                  >
                    Reject
                  </button>
                </>
              )}              {/* After payment is confirmed, allow seller to proceed to pickup */}
              {(order.status === 'paid' || order.status === 'accepted') && (
                <>
                  <button 
                    onClick={() => updateStatus(order._id, 'ready_for_pickup')} 
                    className="flex-1 w-full py-2.5 rounded-xl bg-orange-500 text-white font-bold neomorph-raised active:neomorph-inset transition-all"
                  >
                    Mark Ready for Pickup
                  </button>
                  <button 
                    onClick={() => updateStatus(order._id, 'rejected')} 
                    className="flex-1 py-2.5 rounded-xl text-red-500 font-bold neomorph-raised active:neomorph-inset transition-all border border-red-500"
                  >
                    Reject
                  </button>
                </>
              )}              {order.status === 'accepted' && (
                <button 
                  onClick={() => updateStatus(order._id, 'ready_for_pickup')} 
                  className="w-full py-2.5 rounded-xl bg-green-500 text-white font-bold neomorph-raised active:neomorph-inset transition-all"
                >
                  Mark Ready for Pickup
                </button>
              )}
              {['ready_for_pickup', 'claimed', 'at_store', 'picked_up', 'on_the_way'].includes(order.status) && (
                <div className="w-full text-center py-2 rounded-xl text-muted font-medium text-sm">
                  Waiting for Driver...
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}