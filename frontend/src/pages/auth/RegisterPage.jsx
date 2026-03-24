import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerThunk, selectAuth, clearError } from '@/store/slices/authSlice';
import { Eye, EyeOff, Check } from 'lucide-react';
import { Spinner } from '@/components/ui';

const RULES = [
  { test: v => v.length >= 8,      label: '8+ characters' },
  { test: v => /[A-Z]/.test(v),    label: 'Uppercase letter' },
  { test: v => /[0-9]/.test(v),    label: 'Number' },
];

export default function RegisterPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector(selectAuth);

  const [form, setForm]       = useState({ name: '', email: '', mobile: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    dispatch(clearError());
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(registerThunk(form));
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-canvas font-display font-bold">₹</div>
          <span className="font-display font-bold text-lg text-primary">BillFlow</span>
        </div>

        <h1 className="font-display font-bold text-2xl text-primary mb-1">Create your account</h1>
        <p className="text-sm text-secondary mb-7">Get started with GST billing in minutes</p>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input name="name" type="text" value={form.name} onChange={handleChange}
              required autoFocus placeholder="Hardik Patel"
              className="input-field" />
          </div>

          <div>
            <label className="label">Email address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              required placeholder="you@company.com"
              className="input-field" />
          </div>

          <div>
            <label className="label">Mobile <span className="text-muted normal-case font-normal">(optional)</span></label>
            <input name="mobile" type="tel" value={form.mobile} onChange={handleChange}
              placeholder="9876543210" maxLength={10}
              className="input-field" />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input name="password" type={showPass ? 'text' : 'password'}
                value={form.password} onChange={handleChange}
                required placeholder="Min. 8 characters"
                className="input-field pr-10" />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Password rules */}
            {form.password.length > 0 && (
              <div className="flex gap-3 mt-2 flex-wrap">
                {RULES.map(r => (
                  <div key={r.label} className={`flex items-center gap-1 text-xs ${r.test(form.password) ? 'text-success' : 'text-muted'}`}>
                    <Check size={11} className={r.test(form.password) ? 'text-success' : 'text-muted'} />
                    {r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
            {loading ? <><Spinner size={14} /> Creating account...</> : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-5">
          By signing up you agree to our{' '}
          <a href="#" className="text-secondary hover:text-primary">Terms</a> &{' '}
          <a href="#" className="text-secondary hover:text-primary">Privacy Policy</a>
        </p>

        <p className="text-center text-sm text-secondary mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
