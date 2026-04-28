import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, TrendingUp, ShoppingBag } from "lucide-react";

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isCampaign, setIsCampaign] = useState(false);

  const orderId = searchParams.get("orderId");
  const campaignId = searchParams.get("campaignId");

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // 1. Marketer Campaign Flow
        if (campaignId) {
          setIsCampaign(true);
          const res = await fetch("/api/payment/campaign-success", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ campaignId }),
          });
          const data = await res.json();
          if (res.ok) {
            setStatus("success");
            setMessage("Campaign Launched! Your product is now being promoted.");
          } else {
            throw new Error(data.error || "Failed to verify campaign");
          }
        } 
        // 2. Buyer Order Flow
        else if (orderId) {
          const res = await fetch("/api/payment/payment-success", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ orderId }),
          });
          const data = await res.json();
          if (res.ok) {
            setStatus("success");
            setMessage("Order Placed! You'll receive a digital receipt shortly.");
          } else {
            throw new Error(data.error || "Failed to verify order");
          }
        } 
        else {
          setStatus("error");
          setMessage("No transaction details found in the link.");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message);
      }
    };

    confirmPayment();
  }, [orderId, campaignId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="font-bold text-muted">Finalizing transaction...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6 font-['Plus_Jakarta_Sans']">
      <div className="neomorph-raised rounded-[2.5rem] p-10 max-w-md w-full text-center">
        {status === "success" ? (
          <>
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black mb-2 text-main">Success!</h1>
            <p className="text-muted font-medium mb-8 leading-relaxed">{message}</p>

            <button
              onClick={() => navigate("/dashboard")}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 neomorph-raised active:neomorph-inset transition-all ${
                isCampaign ? "bg-primary text-white" : "bg-main text-white"
              }`}
            >
              {isCampaign ? (
                <>
                  <TrendingUp className="w-5 h-5" /> Back to Marketer Hub
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" /> View My Orders
                </>
              )}
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black mb-2 text-main">Verification Failed</h1>
            <p className="text-muted font-medium mb-8 leading-relaxed">{message}</p>
            
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full py-4 bg-surface text-main rounded-2xl font-bold neomorph-raised active:neomorph-inset transition-all"
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}