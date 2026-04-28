import { Link } from "react-router-dom";
import { Store, ShoppingBasket, Megaphone, ArrowRight, UserCheck, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="bg-surface text-main min-h-screen flex flex-col font-['Plus_Jakarta_Sans']">
      {/* Navigation */}
      <nav className="w-full sticky top-0 z-50 bg-surface flex justify-between items-center px-8 py-4 shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.6)]">
        <div className="text-2xl font-bold text-primary tracking-tight">Bazar Koro</div>
        <div className="hidden md:flex gap-8 items-center font-medium">
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="px-6 py-2 rounded-xl text-muted neomorph-raised neomorph-active transition-all font-semibold">
            Log In
          </Link>
          <Link to="/signup" className="px-6 py-2 rounded-xl bg-surface text-primary font-bold neomorph-raised neomorph-active transition-all">
            Join Now
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="px-8 py-20 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <div className="inline-block px-5 py-2 rounded-full neomorph-inset text-sm text-primary font-bold tracking-wide uppercase shadow-sm">
              Your Hyper-Local Network
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-main leading-tight tracking-tight">
              Trade <span className="text-primary">Locally.</span><br />
              Grow Together.
            </h1>
            <p className="text-lg text-muted max-w-xl leading-relaxed">
              Discover unique products nearby, sell your own creations without shipping fees, or earn by promoting your neighbors. Bazar Koro is purely community-driven.
            </p>
            <div className="flex flex-wrap gap-6 pt-4">
              <Link to="/signup" className="px-8 py-4 rounded-2xl text-primary font-bold text-lg neomorph-raised neomorph-active transition-all flex items-center gap-2">
                Start Trading <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/search" className="px-8 py-4 rounded-2xl text-[#646657] font-bold text-lg neomorph-inset flex items-center shadow-inner hover:bg-[#e1e3e9] transition-colors">
              Browse Marketplace
              </Link>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            <div className="aspect-square rounded-[3rem] neomorph-raised p-6 bg-surface">
              <img 
                className="w-full h-full object-cover rounded-[2rem]" 
                alt="Community Market" 
                src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=2070&auto=format&fit=crop" 
              />
            </div>
            <div className="absolute -bottom-6 -left-6 p-6 rounded-2xl bg-surface neomorph-raised max-w-[220px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full neomorph-inset flex items-center justify-center">
                  <UserCheck className="text-primary w-5 h-5" />
                </div>
                <span className="font-bold text-sm">Verified Locals</span>
              </div>
              <p className="text-xs text-muted mt-1">Join 2.4k active users in your neighborhood.</p>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="px-8 py-24 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-extrabold text-main">Choose Your Role</h2>
              <p className="text-muted max-w-2xl mx-auto text-lg">One unified app. Three powerful ways to participate in your local economy.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Buyer Card */}
              <div className="p-8 rounded-[2rem] bg-surface neomorph-raised transition-transform hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl neomorph-inset mb-6 flex items-center justify-center">
                  <ShoppingBasket className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Buyer</h3>
                <p className="text-muted mb-6 text-sm leading-relaxed">
                  Support neighbors by buying directly. Quality goods without the corporate markups.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="text-primary w-4 h-4" /> Discover fresh local goods</li>
                  <li className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="text-primary w-4 h-4" /> Pick up within minutes</li>
                </ul>
                <Link to="/signup?role=buyer" className="block text-center w-full py-3 rounded-xl neomorph-raised neomorph-active text-primary font-bold">
                  Browse as Buyer
                </Link>
              </div>

              {/* Seller Card */}
              <div className="p-8 rounded-[2rem] bg-surface neomorph-raised transition-transform hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl neomorph-inset mb-6 flex items-center justify-center">
                  <Store className="text-secondary w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Seller</h3>
                <p className="text-muted mb-6 text-sm leading-relaxed">
                  Turn your garage into a storefront. Sell your craft without expensive fees or logistics.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="text-secondary w-4 h-4" /> Zero initial cost</li>
                  <li className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="text-secondary w-4 h-4" /> Build local customer base</li>
                </ul>
                <Link to="/signup?role=seller" className="block text-center w-full py-3 rounded-xl neomorph-raised neomorph-active text-secondary font-bold">
                  Open Store
                </Link>
              </div>

              {/* Marketer Card */}
              <div className="p-8 rounded-[2rem] bg-surface neomorph-raised transition-transform hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl neomorph-inset mb-6 flex items-center justify-center">
                  <Megaphone className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Marketer</h3>
                <p className="text-muted mb-6 text-sm leading-relaxed">
                  Share products from local sellers and earn a commission on every successful referral.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="text-primary w-4 h-4" /> Risk-free earning</li>
                  <li className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="text-primary w-4 h-4" /> Boost local businesses</li>
                </ul>
                {/* UPDATED: Card link for Marketers */}
                <Link to="/marketer/dashboard" className="block text-center w-full py-3 rounded-xl neomorph-raised neomorph-active text-primary font-bold">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-8 flex flex-col md:flex-row justify-between items-center gap-6 bg-surface mt-auto shadow-[inset_4px_4px_8px_rgba(0,0,0,0.06),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]">
        <div className="text-center md:text-left">
          <div className="text-xl font-bold text-primary">Bazar Koro</div>
          <p className="text-muted text-sm mt-1">© 2026 Bazar Koro. Built for cse471 project.</p>
        </div>
        <div className="flex gap-6 text-sm font-medium">
          <span className="text-muted hover:underline cursor-pointer">Privacy</span>
          <span className="text-muted hover:underline cursor-pointer">Terms</span>
          <span className="text-muted hover:underline cursor-pointer">Contact</span>
        </div>
      </footer>
    </div>
  );
}