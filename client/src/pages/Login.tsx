import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error("Cannot connect to the server. Please ensure the backend is running.");
      }
      
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token (in a real app, use better state management or HttpOnly cookies if possible)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.roles.includes("admin")) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Google login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.roles.includes("admin")) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-main font-['Plus_Jakarta_Sans'] min-h-screen flex items-center justify-center p-6">
      <div className="neomorph-raised rounded-[2rem] p-10 w-full max-w-md bg-surface">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-xl font-bold text-primary tracking-tight mb-6">Bazar Koro</Link>
          <h2 className="text-3xl font-extrabold text-main tracking-tight mb-2">Welcome Back</h2>
          <p className="text-muted text-sm">Please enter your details to sign in</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 neomorph-inset text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Email</label>
            <div className="neomorph-inset rounded-xl p-1">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" 
                className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 placeholder:text-slate-400 outline-none text-sm font-medium text-main" 
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">Password</label>
            <div className="neomorph-inset rounded-xl p-1">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 placeholder:text-slate-400 outline-none text-sm font-medium text-main" 
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" />
              <div className="neomorph-inset w-5 h-5 rounded-md flex items-center justify-center transition-all bg-surface">
                <div className="w-2.5 h-2.5 bg-primary rounded-sm opacity-0 group-has-[:checked]:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-xs font-bold text-muted">Remember me</span>
            </label>
            <Link to="#" className="text-xs font-bold text-primary hover:underline">Forgot Password?</Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-4 rounded-xl neomorph-raised bg-surface text-primary font-bold text-lg neomorph-active transition-all disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center w-full gap-4">
            <hr className="flex-1 border-slate-300" />
            <span className="text-xs text-muted font-bold uppercase tracking-widest">OR</span>
            <hr className="flex-1 border-slate-300" />
          </div>
          
          <div className="w-full flex justify-center mt-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google Login Failed")}
              useOneTap
            />
          </div>
        </div>

        <p className="mt-8 text-center text-sm font-medium text-muted">
          Don't have an account? <Link to="/signup" className="text-primary hover:underline font-bold">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
