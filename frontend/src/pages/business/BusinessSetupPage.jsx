import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectActiveBusiness, createBusiness, updateBusiness, fetchBusinesses } from '@/store/slices/businessSlice';
import Topbar from '@/components/layout/Topbar';
import { FormField, Input, Select, Textarea, Spinner } from '@/components/ui';
import { Building2, CreditCard, FileText, Settings2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

const STATE_OPTIONS = [
  ['01','J&K'],['02','Himachal Pradesh'],['03','Punjab'],['04','Chandigarh'],
  ['05','Uttarakhand'],['06','Haryana'],['07','Delhi'],['08','Rajasthan'],
  ['09','Uttar Pradesh'],['10','Bihar'],['11','Sikkim'],['18','Assam'],
  ['19','West Bengal'],['20','Jharkhand'],['21','Odisha'],['22','Chhattisgarh'],
  ['23','Madhya Pradesh'],['24','Gujarat'],['27','Maharashtra'],['28','Andhra Pradesh'],
  ['29','Karnataka'],['30','Goa'],['32','Kerala'],['33','Tamil Nadu'],
  ['34','Puducherry'],['36','Telangana'],['37','Andhra Pradesh (New)'],
];

const TABS = [
  { id: 'basic',    label: 'Basic Info',    icon: Building2 },
  { id: 'address',  label: 'Address & GST', icon: FileText },
  { id: 'bank',     label: 'Bank Details',  icon: CreditCard },
  { id: 'invoice',  label: 'Invoice Setup', icon: Settings2 },
];

const INITIAL = {
  name: '', legalName: '', gstin: '', pan: '', mobile: '', email: '', website: '',
  businessType: 'proprietorship', industry: 'other',
  address: { line1: '', line2: '', city: '', pincode: '', state: '', stateCode: '' },
  bankDetails: { bankName: '', accountNumber: '', ifsc: '', branch: '', accountType: 'current', upiId: '' },
  invoiceSettings: { defaultTaxRate: 5, defaultDueDays: 30, showLotBatch: true, showHsnOnInvoice: true, termsAndConditions: '', notes: '' },
};

export default function BusinessSetupPage() {
  const dispatch  = useDispatch();
  const activeBiz = useSelector(selectActiveBusiness);

  const [tab,     setTab]     = useState('basic');
  const [form,    setForm]    = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const isEdit = !!activeBiz;

  // Populate form when editing
  useEffect(() => {
    if (activeBiz) {
      setForm(prev => ({
        ...prev,
        ...activeBiz,
        address:         { ...INITIAL.address,         ...(activeBiz.address || {}) },
        bankDetails:     { ...INITIAL.bankDetails,     ...(activeBiz.bankDetails || {}) },
        invoiceSettings: { ...INITIAL.invoiceSettings, ...(activeBiz.invoiceSettings || {}) },
      }));
    }
  }, [activeBiz]);

  const set = (path, val) => {
    setErrors(e => { const n = { ...e }; delete n[path]; return n; });
    if (path.includes('.')) {
      const [parent, child] = path.split('.');
      setForm(f => ({ ...f, [parent]: { ...f[parent], [child]: val } }));
    } else {
      setForm(f => ({ ...f, [path]: val }));
    }
  };

  // Auto-fill state from GSTIN
  const handleGstinChange = (val) => {
    set('gstin', val.toUpperCase());
    if (val.length >= 2) {
      const code = val.substring(0, 2);
      const state = STATE_OPTIONS.find(([c]) => c === code);
      if (state) {
        set('address.stateCode', code);
        set('address.state', state[1]);
      }
    }
    // Auto-fill PAN from GSTIN (chars 3-12)
    if (val.length >= 12) set('pan', val.substring(2, 12));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Business name is required';
    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin))
      e.gstin = 'Invalid GSTIN format (e.g. 27AFHPJ0144G1ZS)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) await dispatch(updateBusiness({ id: activeBiz._id, data: form }));
      else        await dispatch(createBusiness(form));
      dispatch(fetchBusinesses());
    } finally {
      setLoading(false);
    }
  };

  const f = (path) => path.includes('.') ? form[path.split('.')[0]]?.[path.split('.')[1]] ?? '' : form[path] ?? '';

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={isEdit ? 'Business Setup' : 'Create Business'}
        actions={
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Spinner size={13} /> : null}
            {isEdit ? 'Save Changes' : 'Create Business'}
          </button>
        }
      />

      <div className="flex-1 p-6 max-w-4xl animate-fade-in">
        {/* Tab bar */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                tab === id ? 'bg-amber-500 text-canvas shadow-sm' : 'text-secondary hover:text-primary'
              )}>
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 animate-slide-up">

          {/* BASIC INFO */}
          {tab === 'basic' && (
            <>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">Business Identity</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Business / Trade Name" required error={errors.name}>
                    <Input value={f('name')} onChange={e => set('name', e.target.value)} placeholder="Hardik Embroidery Works" error={errors.name} />
                  </FormField>
                  <FormField label="Legal Name" hint="If different from trade name">
                    <Input value={f('legalName')} onChange={e => set('legalName', e.target.value)} placeholder="Same as trade name" />
                  </FormField>
                  <FormField label="Business Type">
                    <Select value={f('businessType')} onChange={e => set('businessType', e.target.value)}>
                      {[['proprietorship','Proprietorship'],['partnership','Partnership'],['pvt_ltd','Private Limited'],['ltd','Limited'],['llp','LLP'],['huf','HUF'],['trust','Trust'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Industry">
                    <Select value={f('industry')} onChange={e => set('industry', e.target.value)}>
                      {[['textile_embroidery','Textile & Embroidery'],['jewellery','Jewellery'],['retail','Retail'],['manufacturing','Manufacturing'],['services','Services'],['trading','Trading'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </FormField>
                </div>
              </div>

              <div className="divider" />

              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">Contact Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Mobile">
                    <Input value={f('mobile')} onChange={e => set('mobile', e.target.value)} placeholder="9664261756" maxLength={10} />
                  </FormField>
                  <FormField label="Email">
                    <Input type="email" value={f('email')} onChange={e => set('email', e.target.value)} placeholder="info@hardikembroidery.com" />
                  </FormField>
                  <FormField label="Website">
                    <Input value={f('website')} onChange={e => set('website', e.target.value)} placeholder="www.hardikembroidery.com" />
                  </FormField>
                </div>
              </div>
            </>
          )}

          {/* ADDRESS & GST */}
          {tab === 'address' && (
            <>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">GST Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="GSTIN" error={errors.gstin} hint="Auto-fills state and PAN">
                    <Input
                      value={f('gstin')} onChange={e => handleGstinChange(e.target.value)}
                      placeholder="27AFHPJ0144G1ZS" maxLength={15}
                      className="font-mono tracking-wider uppercase"
                      error={errors.gstin}
                    />
                  </FormField>
                  <FormField label="PAN">
                    <Input value={f('pan')} onChange={e => set('pan', e.target.value.toUpperCase())}
                      placeholder="AFHPJ0144G" maxLength={10}
                      className="font-mono tracking-wider" />
                  </FormField>
                </div>

                {/* GSTIN breakdown preview */}
                {form.gstin?.length === 15 && !errors.gstin && (
                  <div className="mt-3 p-3 bg-surface border border-border rounded-lg flex gap-4 flex-wrap">
                    {[
                      [form.gstin.slice(0,2), 'State Code'],
                      [form.gstin.slice(2,12), 'PAN'],
                      [form.gstin.slice(12,13), 'Entity'],
                      [form.gstin.slice(13,14), 'Z'],
                      [form.gstin.slice(14), 'Check'],
                    ].map(([v, l]) => (
                      <div key={l} className="text-center">
                        <p className="font-mono font-bold text-amber-400 text-sm">{v}</p>
                        <p className="text-[10px] text-muted">{l}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="divider" />

              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">Address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Address Line 1" className="sm:col-span-2">
                    <Input value={f('address.line1')} onChange={e => set('address.line1', e.target.value)}
                      placeholder="87/696-A, Gaikwad Nagar, Gate-8, Malwani" />
                  </FormField>
                  <FormField label="Address Line 2">
                    <Input value={f('address.line2')} onChange={e => set('address.line2', e.target.value)}
                      placeholder="MHB Colony" />
                  </FormField>
                  <FormField label="City">
                    <Input value={f('address.city')} onChange={e => set('address.city', e.target.value)} placeholder="Mumbai" />
                  </FormField>
                  <FormField label="Pincode">
                    <Input value={f('address.pincode')} onChange={e => set('address.pincode', e.target.value)} placeholder="400095" maxLength={6} />
                  </FormField>
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
              </div>
            </>
          )}

          {/* BANK DETAILS */}
          {tab === 'bank' && (
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">Bank Account (shown on invoice)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Bank Name">
                  <Input value={f('bankDetails.bankName')} onChange={e => set('bankDetails.bankName', e.target.value)} placeholder="Bank of Baroda" />
                </FormField>
                <FormField label="Account Type">
                  <Select value={f('bankDetails.accountType')} onChange={e => set('bankDetails.accountType', e.target.value)}>
                    <option value="current">Current Account</option>
                    <option value="savings">Savings Account</option>
                  </Select>
                </FormField>
                <FormField label="Account Number">
                  <Input value={f('bankDetails.accountNumber')} onChange={e => set('bankDetails.accountNumber', e.target.value)}
                    placeholder="12345678901234" className="font-mono" />
                </FormField>
                <FormField label="IFSC Code">
                  <Input value={f('bankDetails.ifsc')} onChange={e => set('bankDetails.ifsc', e.target.value.toUpperCase())}
                    placeholder="BARB0MALVAN" className="font-mono uppercase" maxLength={11} />
                </FormField>
                <FormField label="Branch">
                  <Input value={f('bankDetails.branch')} onChange={e => set('bankDetails.branch', e.target.value)} placeholder="Malvani Branch, Mumbai" />
                </FormField>
                <FormField label="UPI ID" hint="For QR code on modern invoice theme">
                  <Input value={f('bankDetails.upiId')} onChange={e => set('bankDetails.upiId', e.target.value)} placeholder="hardik@upi" />
                </FormField>
              </div>
            </div>
          )}

          {/* INVOICE SETTINGS */}
          {tab === 'invoice' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">Invoice Defaults</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Default GST Rate (%)" hint="Applied when HSN not specified">
                    <Select value={f('invoiceSettings.defaultTaxRate')} onChange={e => set('invoiceSettings.defaultTaxRate', Number(e.target.value))}>
                      {[0, 0.25, 0.5, 1, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Payment Due Days">
                    <Input type="number" value={f('invoiceSettings.defaultDueDays')} onChange={e => set('invoiceSettings.defaultDueDays', Number(e.target.value))}
                      placeholder="30" min={0} max={365} />
                  </FormField>
                </div>
              </div>

              <div className="divider" />

              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">Invoice Options</p>
                <div className="space-y-3">
                  {[
                    ['showLotBatch',      'Show LOT / Batch column', 'Useful for textile, embroidery, manufacturing'],
                    ['showHsnOnInvoice',  'Show HSN/SAC code column', 'Required for B2B GST invoices'],
                  ].map(([key, label, hint]) => (
                    <label key={key} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg cursor-pointer hover:border-borderLight transition-colors">
                      <div>
                        <p className="text-sm font-medium text-primary">{label}</p>
                        <p className="text-xs text-muted">{hint}</p>
                      </div>
                      <div className={clsx('w-10 h-5.5 rounded-full border transition-all duration-200 relative', form.invoiceSettings[key] ? 'bg-amber-500 border-amber-600' : 'bg-surface border-border')}
                        onClick={() => set(`invoiceSettings.${key}`, !form.invoiceSettings[key])}>
                        <div className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200', form.invoiceSettings[key] ? 'translate-x-4.5' : 'translate-x-0.5')} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="divider" />

              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">Invoice Footer Content</p>
                <div className="space-y-4">
                  <FormField label="Terms & Conditions">
                    <Textarea value={f('invoiceSettings.termsAndConditions')} onChange={e => set('invoiceSettings.termsAndConditions', e.target.value)}
                      placeholder="1. Goods once sold will not be taken back.&#10;2. Interest @18% p.a. will be charged on overdue amounts." rows={4} />
                  </FormField>
                  <FormField label="Notes">
                    <Textarea value={f('invoiceSettings.notes')} onChange={e => set('invoiceSettings.notes', e.target.value)}
                      placeholder="Thank you for your business!" rows={2} />
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab nav footer */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setTab(TABS[Math.max(0, TABS.findIndex(t => t.id === tab) - 1)].id)}
            disabled={tab === 'basic'}
            className="btn-secondary disabled:opacity-30">
            ← Previous
          </button>
          {tab !== 'invoice' ? (
            <button
              onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.findIndex(t => t.id === tab) + 1)].id)}
              className="btn-primary">
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Spinner size={13} />}
              {isEdit ? 'Save Changes' : 'Create Business'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
