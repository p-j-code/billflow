import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginThunk, selectAuth, clearError } from '@/store/slices/authSlice';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { Spinner } from '@/components/ui';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector(selectAuth);

  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    dispatch(clearError());
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginThunk(form));
  };

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface border-r border-border flex-col justify-between p-12 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#F59E0B 1px, transparent 1px), linear-gradient(90deg, #F59E0B 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Amber glow orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-canvas font-display font-bold text-lg">₹</div>
          <span className="font-display font-bold text-xl text-primary">BillFlow</span>
        </div>

        {/* Center content */}
        <div className="relative">
          <p className="text-xs text-amber-500 font-semibold uppercase tracking-widest mb-4">GST Billing & Accounting</p>
          <h2 className="font-display font-bold text-4xl text-primary leading-tight mb-6">
            Modern billing<br />for Indian<br />
            <span className="text-gradient-amber">businesses.</span>
          </h2>
          <div className="space-y-3">
            {['GST-compliant Tax Invoices', 'Auto SGST / CGST / IGST calculation', 'Party & ledger management', 'Traditional & modern PDF themes'].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat chips */}
        <div className="flex gap-3 relative">
          {[['₹0', 'Setup cost'], ['5 min', 'First invoice'], ['100%', 'GST compliant']].map(([n, l]) => (
            <div key={l} className="bg-card border border-border rounded-xl px-4 py-3 text-center">
              <p className="font-display font-bold text-lg text-amber-400">{n}</p>
              <p className="text-xs text-muted">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-canvas font-display font-bold">₹</div>
            <span className="font-display font-bold text-lg text-primary">BillFlow</span>
          </div>

          <h1 className="font-display font-bold text-2xl text-primary mb-1">Welcome back</h1>
          <p className="text-sm text-secondary mb-8">Sign in to your BillFlow account</p>

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                name="email" type="email" value={form.email}
                onChange={handleChange} required autoFocus
                placeholder="you@company.com"
                className="input-field"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <a href="#" className="text-xs text-amber-500 hover:text-amber-400 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  name="password" type={showPass ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  required placeholder="••••••••"
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
              {loading ? <><Spinner size={14} /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-secondary mt-6">
            New to BillFlow?{' '}
            <Link to="/register" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
