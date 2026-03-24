import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createParty, updateParty } from '@/store/slices/partySlice';
import { Modal, FormField, Input, Select, Textarea, Spinner } from '@/components/ui';

const STATE_OPTIONS = [
  ['01','J&K'],['02','Himachal Pradesh'],['03','Punjab'],['04','Chandigarh'],
  ['05','Uttarakhand'],['06','Haryana'],['07','Delhi'],['08','Rajasthan'],
  ['09','Uttar Pradesh'],['10','Bihar'],['18','Assam'],['19','West Bengal'],
  ['20','Jharkhand'],['21','Odisha'],['22','Chhattisgarh'],['23','Madhya Pradesh'],
  ['24','Gujarat'],['27','Maharashtra'],['28','Andhra Pradesh'],['29','Karnataka'],
  ['30','Goa'],['32','Kerala'],['33','Tamil Nadu'],['34','Puducherry'],
  ['36','Telangana'],['37','Andhra Pradesh (New)'],
];

const INITIAL = {
  name: '', displayName: '', type: 'customer', gstin: '', pan: '',
  mobile: '', alternateMobile: '', email: '', contactPerson: '',
  address: { line1: '', line2: '', city: '', pincode: '', state: '', stateCode: '' },
  creditLimit: '', creditDays: 30, openingBalance: 0, openingBalanceType: 'debit', notes: '',
};

export default function PartyFormModal({ open, onClose, party }) {
  const dispatch = useDispatch();
  const [form, setForm]      = useState(INITIAL);
  const [tab, setTab]        = useState('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]  = useState({});
  const isEdit = !!party;

  useEffect(() => {
    if (party) {
      setForm({
        ...INITIAL, ...party,
        address: { ...INITIAL.address, ...(party.address || {}) },
      });
    } else {
      setForm(INITIAL);
    }
    setTab('basic');
    setErrors({});
  }, [party, open]);

  const set = (path, val) => {
    setErrors(e => { const n = { ...e }; delete n[path]; return n; });
    if (path.includes('.')) {
      const [p, c] = path.split('.');
      setForm(f => ({ ...f, [p]: { ...f[p], [c]: val } }));
    } else {
      setForm(f => ({ ...f, [path]: val }));
    }
  };

  // Auto-fill state from GSTIN
  const handleGstin = (val) => {
    set('gstin', val.toUpperCase());
    if (val.length >= 2) {
      const code = val.substring(0, 2);
      const state = STATE_OPTIONS.find(([c]) => c === code);
      if (state) { set('address.stateCode', code); set('address.state', state[1]); }
    }
    if (val.length >= 12) set('pan', val.substring(2, 12));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.type) e.type = 'Type is required';
    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin))
      e.gstin = 'Invalid GSTIN format';
    if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile))
      e.mobile = 'Invalid mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form, creditLimit: form.creditLimit ? Number(form.creditLimit) : 0 };
      if (isEdit) await dispatch(updateParty({ id: party._id, data: payload }));
      else        await dispatch(createParty(payload));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const f = (path) => path.includes('.') ? form[path.split('.')[0]]?.[path.split('.')[1]] ?? '' : form[path] ?? '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Party — ${party?.name}` : 'Add New Party'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={loading}>
            {loading && <Spinner size={13} />}
            {isEdit ? 'Save Changes' : 'Add Party'}
          </button>
        </>
      }
    >
      {/* Sub-tabs inside modal */}
      <div className="flex gap-0.5 bg-surface border border-border rounded-lg p-1 mb-5">
        {[['basic', 'Basic Info'], ['address', 'Address'], ['financial', 'Financial']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === id ? 'bg-amber-500 text-canvas' : 'text-secondary hover:text-primary'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* BASIC INFO */}
      {tab === 'basic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Party Type" required error={errors.type}>
              <Select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
                <option value="both">Both</option>
              </Select>
            </FormField>
            <FormField label="Display Name" hint="Short name for dropdowns">
              <Input value={f('displayName')} onChange={e => set('displayName', e.target.value)} placeholder="MEENA ARTS" />
            </FormField>
          </div>

          <FormField label="Full Name" required error={errors.name}>
            <Input value={f('name')} onChange={e => set('name', e.target.value)}
              placeholder="Meena Arts — 388 Sheikh Memon St" error={errors.name} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="GSTIN" error={errors.gstin} hint="Auto-fills state">
              <Input value={f('gstin')} onChange={e => handleGstin(e.target.value)}
                placeholder="27AABFM0714E1ZU" maxLength={15}
                className="font-mono tracking-wider uppercase" error={errors.gstin} />
            </FormField>
            <FormField label="PAN">
              <Input value={f('pan')} onChange={e => set('pan', e.target.value.toUpperCase())}
                placeholder="AABFM0714E" maxLength={10} className="font-mono uppercase" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Mobile" error={errors.mobile}>
              <Input value={f('mobile')} onChange={e => set('mobile', e.target.value)}
                placeholder="9876543210" maxLength={10} error={errors.mobile} />
            </FormField>
            <FormField label="Alternate Mobile">
              <Input value={f('alternateMobile')} onChange={e => set('alternateMobile', e.target.value)}
                placeholder="9876543210" maxLength={10} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <Input type="email" value={f('email')} onChange={e => set('email', e.target.value)} placeholder="meena@example.com" />
            </FormField>
            <FormField label="Contact Person">
              <Input value={f('contactPerson')} onChange={e => set('contactPerson', e.target.value)} placeholder="Meena Shah" />
            </FormField>
          </div>
        </div>
      )}

      {/* ADDRESS */}
      {tab === 'address' && (
        <div className="space-y-4">
          <FormField label="Address Line 1">
            <Input value={f('address.line1')} onChange={e => set('address.line1', e.target.value)}
              placeholder="388 Sheikh Memon Street, Mangaldas Market" />
          </FormField>
          <FormField label="Address Line 2">
            <Input value={f('address.line2')} onChange={e => set('address.line2', e.target.value)}
              placeholder="Below Old Bank of Baroda" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="City">
              <Input value={f('address.city')} onChange={e => set('address.city', e.target.value)} placeholder="Mumbai" />
            </FormField>
            <FormField label="Pincode">
              <Input value={f('address.pincode')} onChange={e => set('address.pincode', e.target.value)} placeholder="400002" maxLength={6} />
            </FormField>
          </div>
          <FormField label="State">
            <Select value={f('address.stateCode')} onChange={e => {
              const opt = STATE_OPTIONS.find(([c]) => c === e.target.value);
              set('address.stateCode', e.target.value);
              set('address.state', opt?.[1] || '');
            }}>
              <option value="">Select state</option>
              {STATE_OPTIONS.map(([code, name]) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </Select>
          </FormField>
        </div>
      )}

      {/* FINANCIAL */}
      {tab === 'financial' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Credit Limit (₹)" hint="0 = no limit">
              <Input type="number" value={f('creditLimit')} onChange={e => set('creditLimit', e.target.value)} placeholder="0" min={0} />
            </FormField>
            <FormField label="Credit Days">
              <Input type="number" value={f('creditDays')} onChange={e => set('creditDays', Number(e.target.value))} placeholder="30" min={0} max={365} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Opening Balance (₹)">
              <Input type="number" value={f('openingBalance')} onChange={e => set('openingBalance', Number(e.target.value))} placeholder="0" min={0} />
            </FormField>
            <FormField label="Balance Type">
              <Select value={f('openingBalanceType')} onChange={e => set('openingBalanceType', e.target.value)}>
                <option value="debit">Debit (they owe us)</option>
                <option value="credit">Credit (we owe them)</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea value={f('notes')} onChange={e => set('notes', e.target.value)} placeholder="Any internal notes about this party..." rows={3} />
          </FormField>
        </div>
      )}
    </Modal>
  );
}
