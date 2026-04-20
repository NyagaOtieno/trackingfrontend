import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Lock, User, AlertCircle, Truck } from "lucide-react";
import { motion } from "framer-motion";

const QUICK_USERS = [
  {
    email: "testadmin@example.com",
    password: "admin123",
    name: "System Admin",
    role: "admin",
  },
  {
    email: "staff@test.com",
    password: "123456",
    name: "Staff User",
    role: "staff",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Auth store hooks
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const isLoading = useAuthStore((s) => s.isLoading);
  const clearError = useAuthStore((s) => s.clearError);

  const navigate = useNavigate();

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();

    if (!email || !password) return;

    const success = await login(email.trim(), password);
    if (success) navigate("/", { replace: true });
  };

  // Quick-fill credentials
  const fillCredentials = async (nextEmail: string, nextPassword: string) => {
    setEmail(nextEmail);
    setPassword(nextPassword);
    clearError();

    // Optional: auto-login
    const success = await login(nextEmail, nextPassword);
    if (success) navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Truck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Jendie Tracking Platform
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your fleet dashboard
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-4"
        >
          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  if (error) clearError();
                  setEmail(e.target.value);
                }}
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="w-full bg-muted border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  if (error) clearError();
                  setPassword(e.target.value);
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-muted border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Quick Accounts */}
        <div className="mt-6 bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Quick Accounts
          </p>
          <div className="space-y-2">
            {QUICK_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => fillCredentials(u.email, u.password)}
                className="w-full flex items-center justify-between bg-muted hover:bg-secondary rounded-lg px-3 py-2.5 transition-colors text-left"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">{u.name}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
                <span className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded-md font-medium">
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}