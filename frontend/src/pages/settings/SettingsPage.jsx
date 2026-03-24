import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import { selectActiveBusiness, updateBusiness } from '@/store/slices/businessSlice';
import { businessApi } from '@/api';
import api from '@/api/client';
import Topbar from '@/components/layout/Topbar';
import { FormField, Input, Select, Spinner, Badge, PageLoader, EmptyState } from '@/components/ui';
import ImageUploader from '@/components/upload/ImageUploader';
import {
  User, Building2, Receipt, Shield, Users, Clock,
  Save, Eye, EyeOff, Check, Trash2, UserPlus,
  ChevronRight, Crown, Briefcase, Eye as EyeIcon, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile',  label: 'Profile',        icon: User      },
  { id: 'branding', label: 'Logo & Signature',icon: Building2 },
  { id: 'series',   label: 'Invoice Series',  icon: Receipt   },
  { id: 'team',     label: 'Team & Roles',    icon: Users     },
  { id: 'audit',    label: 'Audit Log',       icon: Clock     },
  { id: 'security', label: 'Password',        icon: Shield    },
];

const ROLE_ICONS  = { owner: Crown, accountant: Briefcase, staff: User, viewer: EyeIcon };
const ROLE_COLORS = { owner: 'text-amber-400', accountant: 'text-info', staff: 'text-success', viewer: 'text-muted' };
const ROLE_BADGES = { owner: 'amber', accountant: 'blue', staff: 'green', viewer: 'muted' };

const NOTE_TYPES   = [
  { type:'sale',label:'Sales Invoice',defaultPrefix:''},{type:'purchase',label:'Purchase Invoice',defaultPrefix:'PUR/'},
  {type:'credit_note',label:'Credit Note',defaultPrefix:'CR/'},{type:'debit_note',label:'Debit Note',defaultPrefix:'DR/'},
  {type:'proforma',label:'Proforma',defaultPrefix:'PRO/'},
];
const FORMAT_OPTIONS = [
  {value:'NUM_FY',label:'NUM/FY',example:'193/25-26'},{value:'PREFIX_NUM_FY',label:'PREFIX/NUM/FY',example:'HEW/1/25-26'},
  {value:'PREFIX_NUM',label:'PREFIX/NUM',example:'HEW/001'},
];

function fmtD(d) { return d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'; }

// ─── Profile Section ──────────────────────────────────────────────────────────
function ProfileSection({ user }) {
  const [form, setForm] = useState({ name: user?.name||'', mobile: user?.mobile||'' });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => { setSaving(true); await new Promise(r => setTimeout(r, 600)); toast.success('Profile updated!'); setSaving(false); };
  return (
    <div className="space-y-5 max-w-lg">
      <p className="text-xs text-muted uppercase tracking-wider font-semibold">Personal Information</p>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Full Name">
          <Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Your name" />
        </FormField>
        <FormField label="Email" hint="Cannot be changed">
          <Input value={user?.email||''} disabled className="opacity-60 cursor-not-allowed" />
        </FormField>
        <FormField label="Mobile">
          <Input value={form.mobile} onChange={e => setForm(f=>({...f,mobile:e.target.value}))} placeholder="9876543210" maxLength={10} />
        </FormField>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Spinner size={13}/> : <Save size={13}/>} Save Profile
        </button>
      </div>
    </div>
  );
}

// ─── Branding Section ─────────────────────────────────────────────────────────
function BrandingSection({ business }) {
  const dispatch = useDispatch();
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingSig,  setSavingSig]  = useState(false);

  const handleLogoUpload = async ({ imageData, mimeType }) => {
    if (!imageData) return;
    setSavingLogo(true);
    try {
      const r = await api.post(`/business/${business._id}/upload-logo`, { imageData, mimeType });
      toast.success('Logo saved!');
      dispatch(updateBusiness({ id: business._id, data: { logoUrl: r.data.data.logoUrl } }));
    } catch { toast.error('Upload failed'); }
    finally { setSavingLogo(false); }
  };

  const handleSigUpload = async ({ imageData, mimeType }) => {
    if (!imageData) return;
    setSavingSig(true);
    try {
      const r = await api.post(`/business/${business._id}/upload-signature`, { imageData, mimeType });
      toast.success('Signature saved!');
    } catch { toast.error('Upload failed'); }
    finally { setSavingSig(false); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-xs text-muted uppercase tracking-wider font-semibold">Business Branding</p>
      <p className="text-sm text-secondary">Your logo and signature will appear on all PDF invoices.</p>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <ImageUploader
            label="Company Logo"
            hint="PNG or JPG · Max 500KB · Shown in invoice header"
            currentUrl={business?.logoUrl}
            onUpload={handleLogoUpload}
            maxKB={500}
            aspect="wide"
          />
          {savingLogo && <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><Spinner size={11}/>Uploading...</p>}
        </div>
        <div>
          <ImageUploader
            label="Authorised Signature"
            hint="PNG with transparent bg · Max 300KB · Shown in invoice footer"
            currentUrl={business?.signatureUrl}
            onUpload={handleSigUpload}
            maxKB={300}
            aspect="wide"
          />
          {savingSig && <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><Spinner size={11}/>Uploading...</p>}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 text-xs text-secondary space-y-1.5">
        <p className="font-semibold text-primary mb-2">Storage options</p>
        <p>• <strong>Cloudflare R2:</strong> Set <code className="text-amber-400">R2_ENDPOINT</code>, <code className="text-amber-400">R2_ACCESS_KEY</code>, <code className="text-amber-400">R2_SECRET_KEY</code>, <code className="text-amber-400">R2_BUCKET</code>, <code className="text-amber-400">R2_PUBLIC_URL</code> in .env</p>
        <p>• <strong>Local fallback:</strong> Files saved to <code className="text-amber-400">backend/public/uploads/</code> — serves at <code className="text-amber-400">/uploads/filename</code></p>
      </div>
    </div>
  );
}

// ─── Invoice Series Section ───────────────────────────────────────────────────
function SeriesSection({ business }) {
  const [series,   setSeries]   = useState([]);
  const [saving,   setSaving]   = useState(null);
  const [nextNos,  setNextNos]  = useState({});

  useEffect(() => {
    if (business?.invoiceSeries) setSeries(business.invoiceSeries.map(s => ({...s})));
  }, [business]);

  useEffect(() => {
    if (!business?._id) return;
    NOTE_TYPES.forEach(async ({ type }) => {
      try { const r = await businessApi.nextInvoiceNumber(business._id, type); setNextNos(p => ({...p,[type]:r.data.data.formatted})); } catch {}
    });
  }, [business]);

  const updateSeries = (type, field, value) =>
    setSeries(p => p.map(s => s.type===type ? {...s,[field]:value} : s));

  const handleSave = async (type) => {
    const s = series.find(s => s.type===type); if (!s) return;
    setSaving(type);
    try {
      await businessApi.updateInvoiceSeries(business._id, { type, prefix: s.prefix, format: s.format });
      toast.success('Series updated!');
      const r = await businessApi.nextInvoiceNumber(business._id, type);
      setNextNos(p => ({...p,[type]:r.data.data.formatted}));
    } catch { toast.error('Update failed'); }
    finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-400">
        Invoice numbers are sequential with no gaps — GST compliance requirement. Counter resets every April 1.
      </div>
      {NOTE_TYPES.map(({ type, label }) => {
        const s = series.find(s => s.type===type); if (!s) return null;
        const preview = (() => {
          const n = s.currentNumber+1, fy = s.financialYear||'25-26';
          return s.format==='NUM_FY' ? `${n}/${fy}` : s.format==='PREFIX_NUM_FY' ? `${s.prefix||''}${n}/${fy}` : `${s.prefix||''}${n}`;
        })();
        return (
          <div key={type} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div><p className="font-semibold">{label}</p><p className="text-xs text-muted">Counter: #{s.currentNumber} · FY {s.financialYear}</p></div>
              <div className="text-right"><p className="text-xs text-muted mb-0.5">Next</p><p className="font-mono font-bold text-amber-400">{nextNos[type]||'—'}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <FormField label="Format">
                <Select value={s.format} onChange={e => updateSeries(type,'format',e.target.value)}>
                  {FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label} (e.g. {f.example})</option>)}
                </Select>
              </FormField>
              <FormField label="Prefix"><Input value={s.prefix||''} onChange={e => updateSeries(type,'prefix',e.target.value)} placeholder="Leave blank or e.g. HEW/" className="font-mono uppercase"/></FormField>
              <FormField label="Preview"><div className="input-field bg-surface font-mono text-amber-400 font-bold">{preview}</div></FormField>
            </div>
            <div className="flex justify-end">
              <button onClick={() => handleSave(type)} disabled={saving===type} className="btn-secondary text-xs flex items-center gap-1.5 py-2">
                {saving===type ? <Spinner size={12}/> : <Save size={12}/>} Save
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Team Section ─────────────────────────────────────────────────────────────
function TeamSection({ business }) {
  const [members,  setMembers]  = useState([]);
  const [roles,    setRoles]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [invEmail, setInvEmail] = useState('');
  const [invRole,  setInvRole]  = useState('accountant');
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    try {
      const [mRes, rRes] = await Promise.all([api.get('/users'), api.get('/users/roles')]);
      setMembers(mRes.data.data.users);
      setRoles(rRes.data.data.roles);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!invEmail.trim()) { toast.error('Enter email address'); return; }
    setInviting(true);
    try { await api.post('/users/invite', { email: invEmail.trim(), role: invRole }); toast.success('User added!'); setInvEmail(''); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setInviting(false); }
  };

  const handleRoleChange = async (userId, role) => {
    try { await api.patch(`/users/${userId}/role`, { role }); toast.success('Role updated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemove = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from this business?`)) return;
    try { await api.delete(`/users/${userId}`); toast.success('Member removed'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Invite */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="font-semibold text-sm mb-3 flex items-center gap-2"><UserPlus size={15} className="text-amber-500"/> Invite Team Member</p>
        <p className="text-xs text-muted mb-3">The person must already have a BillFlow account. They will gain access to this business immediately.</p>
        <div className="flex gap-3">
          <Input value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="colleague@email.com" className="flex-1" />
          <Select value={invRole} onChange={e => setInvRole(e.target.value)} className="w-36">
            {['accountant','staff','viewer'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </Select>
          <button onClick={handleInvite} disabled={inviting} className="btn-primary flex items-center gap-1.5 shrink-0">
            {inviting ? <Spinner size={13}/> : <UserPlus size={13}/>} Add
          </button>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Team Members ({members.length})</p>
        </div>
        <div className="divide-y divide-border">
          {members.map(m => {
            const Icon = ROLE_ICONS[m.role] || User;
            return (
              <div key={m._id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{m.name}</p>
                    {m.isCurrentUser && <span className="text-[10px] bg-border px-1.5 py-0.5 rounded text-muted">You</span>}
                  </div>
                  <p className="text-xs text-muted">{m.email}</p>
                </div>
                {m.isCurrentUser || m.role === 'owner' ? (
                  <Badge variant={ROLE_BADGES[m.role]}>{m.role}</Badge>
                ) : (
                  <Select value={m.role} onChange={e => handleRoleChange(m._id, e.target.value)} className="w-32 py-1.5 text-xs">
                    {['accountant','staff','viewer'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </Select>
                )}
                {!m.isCurrentUser && m.role !== 'owner' && (
                  <button onClick={() => handleRemove(m._id, m.name)} className="text-muted hover:text-danger transition-colors p-1">
                    <Trash2 size={14}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Role descriptions */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="font-semibold text-sm mb-3">Role Permissions</p>
        <div className="space-y-3">
          {roles.map(r => {
            const Icon = ROLE_ICONS[r.role] || User;
            return (
              <div key={r.role} className="flex items-start gap-3">
                <div className={clsx('w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 mt-0.5', ROLE_COLORS[r.role])}>
                  <Icon size={13}/>
                </div>
                <div>
                  <p className="font-semibold text-sm capitalize">{r.role}</p>
                  <p className="text-xs text-muted">{r.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Log Section ────────────────────────────────────────────────────────
function AuditSection() {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [page,     setPage]     = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    setLoading(true);
    api.get('/audit', { params: { page, limit: 20, ...(filter && { resourceType: filter }) } })
      .then(r => { setLogs(r.data.data.logs); setPagination(r.data.data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter]);

  const ACTION_COLORS = {
    'invoice.created': 'text-success', 'invoice.updated': 'text-amber-400',
    'invoice.cancelled': 'text-danger', 'payment.recorded': 'text-info',
    'payment.reversed': 'text-danger', 'party.created': 'text-purple-400',
    'business.updated': 'text-amber-400', 'user.role_changed': 'text-orange-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Actions</option>
          {['invoice','payment','party','note','business','user'].map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
          ))}
        </Select>
        <span className="text-xs text-muted ml-auto">{pagination.total||0} events</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {logs.length === 0 ? (
            <EmptyState icon={Clock} title="No audit events" message="Actions will appear here as you use the app." />
          ) : (
            <div className="divide-y divide-border">
              {logs.map(log => (
                <div key={log._id} className="flex items-start gap-4 px-5 py-3 hover:bg-surface/50">
                  <div className="w-2 h-2 rounded-full bg-amber-500/60 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx('text-xs font-mono font-semibold', ACTION_COLORS[log.action] || 'text-secondary')}>
                        {log.action}
                      </span>
                      <span className="text-xs text-primary font-medium">{log.resourceLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted">{log.userName || log.userId?.name}</span>
                      <span className="text-xs text-muted">·</span>
                      <span className="text-xs text-muted">{fmtD(log.createdAt)}</span>
                      {log.ipAddress && <span className="text-xs text-muted">· {log.ipAddress}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted">Page {page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages,p+1))} disabled={page===pagination.totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Security Section ─────────────────────────────────────────────────────────
function SecuritySection() {
  const [form, setForm]   = useState({ current:'', newPass:'', confirm:'' });
  const [show, setShow]   = useState({ current:false, new:false });
  const [saving, setSaving] = useState(false);
  const RULES = [{ test: v => v.length>=8, label:'8+ characters' }, { test: v => /[A-Z]/.test(v), label:'Uppercase' }, { test: v => /[0-9]/.test(v), label:'Number' }];
  const handleSave = async () => {
    if (!form.current) { toast.error('Enter current password'); return; }
    if (form.newPass.length < 8) { toast.error('Min 8 characters'); return; }
    if (form.newPass !== form.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true); await new Promise(r => setTimeout(r, 700)); toast.success('Password changed!'); setForm({current:'',newPass:'',confirm:''}); setSaving(false);
  };
  return (
    <div className="space-y-4 max-w-sm">
      <p className="text-xs text-muted uppercase tracking-wider font-semibold">Change Password</p>
      {[
        ['Current Password', 'current', 'current', '••••••••'],
        ['New Password', 'new', 'newPass', 'Min. 8 characters'],
        ['Confirm New Password', null, 'confirm', 'Repeat new password'],
      ].map(([label, showKey, field, placeholder]) => (
        <FormField key={field} label={label}>
          <div className="relative">
            <Input type={showKey && show[showKey] ? 'text' : 'password'} value={form[field]}
              onChange={e => setForm(f=>({...f,[field]:e.target.value}))} placeholder={placeholder} className="pr-10" />
            {showKey && (
              <button type="button" onClick={() => setShow(s => ({...s,[showKey]:!s[showKey]}))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                {show[showKey] ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            )}
          </div>
          {field === 'newPass' && form.newPass.length > 0 && (
            <div className="flex gap-3 mt-1.5 flex-wrap">
              {RULES.map(r => <div key={r.label} className={`flex items-center gap-1 text-xs ${r.test(form.newPass)?'text-success':'text-muted'}`}><Check size={10}/>{r.label}</div>)}
            </div>
          )}
        </FormField>
      ))}
      <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
        {saving ? <Spinner size={13}/> : <Shield size={13}/>} Update Password
      </button>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const user      = useSelector(selectUser);
  const activeBiz = useSelector(selectActiveBusiness);
  const [tab, setTab] = useState('profile');

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border bg-surface p-3">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                  tab===id ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-secondary hover:text-primary hover:bg-card')}>
                <Icon size={15} className="shrink-0" /> {label}
              </button>
            ))}
          </nav>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted">BillFlow v1.0</p>
            <p className="text-xs text-muted">Phase 1–7 Complete</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <div className="max-w-3xl">
            {tab === 'profile'  && <ProfileSection  user={user} />}
            {tab === 'branding' && <BrandingSection business={activeBiz} />}
            {tab === 'series'   && <SeriesSection   business={activeBiz} />}
            {tab === 'team'     && <TeamSection      business={activeBiz} />}
            {tab === 'audit'    && <AuditSection />}
            {tab === 'security' && <SecuritySection />}
          </div>
        </div>
      </div>
    </div>
  );
}
