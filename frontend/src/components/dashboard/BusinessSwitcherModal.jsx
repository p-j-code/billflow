import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectBusiness, setActiveBusiness, createBusiness, fetchBusinesses } from '@/store/slices/businessSlice';
import { authApi } from '@/api';
import { Modal, FormField, Input, Select, Spinner } from '@/components/ui';
import { Building2, Plus, Check, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const INDUSTRY_LABELS = {
  textile_embroidery: 'Textile & Embroidery', jewellery: 'Jewellery',
  retail: 'Retail', manufacturing: 'Manufacturing',
  services: 'Services', trading: 'Trading', other: 'Other',
};

function CreateBusinessForm({ onSuccess, onCancel }) {
  const dispatch = useDispatch();
  const [form, setForm]     = useState({ name: '', gstin: '', industry: 'other', businessType: 'proprietorship' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Business name is required'); return; }
    setSaving(true);
    try {
      const result = await dispatch(createBusiness(form));
      if (!result.error) {
        dispatch(fetchBusinesses());
        onSuccess?.();
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 pt-2">
      <FormField label="Business Name" required>
        <Input value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Hardik Embroidery Works" autoFocus />
      </FormField>
      <FormField label="GSTIN" hint="You can add this later in Business Setup">
        <Input value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())}
          placeholder="27AFHPJ0144G1ZS" maxLength={15} className="font-mono uppercase" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Business Type">
          <Select value={form.businessType} onChange={e => set('businessType', e.target.value)}>
            {[['proprietorship','Proprietorship'],['partnership','Partnership'],['pvt_ltd','Pvt Ltd'],['other','Other']].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Industry">
          <Select value={form.industry} onChange={e => set('industry', e.target.value)}>
            {Object.entries(INDUSTRY_LABELS).map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleCreate} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Spinner size={13} /> : <Plus size={13} />} Create Business
        </button>
      </div>
    </div>
  );
}

export default function BusinessSwitcherModal({ open, onClose }) {
  const dispatch   = useDispatch();
  const { list, activeBusiness } = useSelector(selectBusiness);
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState(null);

  const handleSwitch = async (biz) => {
    if (biz._id === activeBusiness?._id) { onClose(); return; }
    setSwitching(biz._id);
    try {
      await authApi.switchBusiness(biz._id);
      dispatch(setActiveBusiness(biz));
      toast.success(`Switched to ${biz.name}`);
      onClose();
      window.location.reload(); // reload to refresh all data
    } catch { toast.error('Failed to switch'); }
    finally { setSwitching(null); }
  };

  return (
    <Modal open={open} onClose={onClose} title={creating ? 'Create New Business' : 'Switch Business'} size="sm">
      {creating ? (
        <CreateBusinessForm
          onSuccess={() => { setCreating(false); }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <div className="space-y-2">
          {list.map(biz => {
            const isActive = biz._id === activeBusiness?._id;
            return (
              <button key={biz._id} onClick={() => handleSwitch(biz)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-card border-border hover:border-borderLight hover:bg-surface'
                )}>
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg shrink-0',
                  isActive ? 'bg-amber-500 text-canvas' : 'bg-surface border border-border text-secondary'
                )}>
                  {biz.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className={clsx('font-semibold text-sm truncate', isActive ? 'text-amber-400' : 'text-primary')}>
                    {biz.name}
                  </p>
                  {biz.gstin
                    ? <p className="text-xs text-muted font-mono truncate">{biz.gstin}</p>
                    : <p className="text-xs text-muted">No GSTIN</p>
                  }
                </div>
                {isActive
                  ? <Check size={16} className="text-amber-500 shrink-0" />
                  : switching === biz._id
                    ? <Spinner size={14} />
                    : <ChevronRight size={14} className="text-muted shrink-0" />
                }
              </button>
            );
          })}

          {/* Add new */}
          <button onClick={() => setCreating(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border text-muted hover:text-primary hover:border-amber-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
              <Plus size={16} />
            </div>
            <span className="text-sm font-medium">Add new business</span>
          </button>
        </div>
      )}
    </Modal>
  );
}
