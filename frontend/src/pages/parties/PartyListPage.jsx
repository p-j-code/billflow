import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchParties, deleteParty, selectParty } from '@/store/slices/partySlice';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import Topbar from '@/components/layout/Topbar';
import PartyFormModal from './PartyFormModal';
import { Badge, EmptyState, SkeletonRows, ConfirmDialog } from '@/components/ui';
import {
  Plus, Search, Filter, Users, MoreVertical,
  Pencil, Trash2, Phone, Mail, Building,
} from 'lucide-react';
import clsx from 'clsx';

const TYPE_BADGE = {
  customer: 'blue',
  supplier: 'green',
  both:     'amber',
};

export default function PartyListPage() {
  const dispatch    = useDispatch();
  const activeBiz   = useSelector(selectActiveBusiness);
  const { list: parties, pagination, loading } = useSelector(selectParty);
  const [searchParams, setSearchParams] = useSearchParams();

  const [search,   setSearch]   = useState('');
  const [typeFilter, setType]   = useState('');
  const [page,     setPage]     = useState(1);
  const [modal,    setModal]    = useState(null);   // null | 'create' | party object
  const [confirm,  setConfirm]  = useState(null);   // party to delete
  const [deleting, setDeleting] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);   // party._id

  // Open create modal if ?action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setModal('create');
      setSearchParams({});
    }
  }, [searchParams]);

  const load = useCallback(() => {
    if (!activeBiz) return;
    dispatch(fetchParties({ search, type: typeFilter, page, limit: 15 }));
  }, [dispatch, activeBiz, search, typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async () => {
    setDeleting(true);
    await dispatch(deleteParty(confirm._id));
    setDeleting(false);
    setConfirm(null);
  };

  const closeModal = () => { setModal(null); load(); };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Parties"
        actions={
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setModal('create')}>
            <Plus size={14} /> Add Party
          </button>
        }
      />

      <div className="flex-1 p-6 animate-fade-in">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, GSTIN, mobile..."
              className="input-field pl-9"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1.5 bg-card border border-border rounded-lg p-1">
            {[['', 'All'], ['customer', 'Customers'], ['supplier', 'Suppliers']].map(([v, l]) => (
              <button key={v} onClick={() => { setType(v); setPage(1); }}
                className={clsx('px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                  typeFilter === v ? 'bg-amber-500 text-canvas' : 'text-secondary hover:text-primary'
                )}>
                {l}
              </button>
            ))}
          </div>

          {/* Count */}
          <span className="text-xs text-muted ml-auto">
            {pagination?.total ?? 0} parties
          </span>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="table-head">Party</th>
                <th className="table-head">Type</th>
                <th className="table-head hidden md:table-cell">GSTIN</th>
                <th className="table-head hidden lg:table-cell">Contact</th>
                <th className="table-head hidden lg:table-cell">State</th>
                <th className="table-head text-right">Balance</th>
                <th className="table-head w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows rows={6} cols={7} />
              ) : parties.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState
                    icon={Users}
                    title="No parties yet"
                    message="Add your first customer or supplier to get started."
                    action={
                      <button className="btn-primary flex items-center gap-2" onClick={() => setModal('create')}>
                        <Plus size={14} /> Add Party
                      </button>
                    }
                  />
                </td></tr>
              ) : parties.map(party => (
                <tr key={party._id} className="table-row group cursor-pointer">
                  {/* Name */}
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm shrink-0 font-display">
                        {(party.displayName || party.name).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">{party.name}</p>
                        {party.displayName && party.displayName !== party.name && (
                          <p className="text-xs text-muted">{party.displayName}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="table-cell">
                    <Badge variant={TYPE_BADGE[party.type]}>{party.type}</Badge>
                  </td>

                  {/* GSTIN */}
                  <td className="table-cell hidden md:table-cell">
                    {party.gstin ? (
                      <span className="font-mono text-xs text-secondary">{party.gstin}</span>
                    ) : (
                      <span className="text-xs text-muted italic">Unregistered</span>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="table-cell hidden lg:table-cell">
                    <div className="space-y-0.5">
                      {party.mobile && (
                        <div className="flex items-center gap-1.5 text-xs text-secondary">
                          <Phone size={10} className="text-muted" /> {party.mobile}
                        </div>
                      )}
                      {party.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Mail size={10} /> {party.email}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* State */}
                  <td className="table-cell hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                      <Building size={11} className="text-muted" />
                      {party.stateFromGstin || party.address?.state || '—'}
                    </div>
                  </td>

                  {/* Balance */}
                  <td className="table-cell text-right">
                    <div>
                      <p className={clsx('text-sm font-semibold font-mono',
                        party.currentBalance > 0 ? 'text-success' : party.currentBalance < 0 ? 'text-danger' : 'text-muted'
                      )}>
                        ₹{Math.abs(party.currentBalance || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-muted capitalize">{party.currentBalance >= 0 ? party.currentBalanceType || 'debit' : 'credit'}</p>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="table-cell">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === party._id ? null : party._id)}
                        className="p-1.5 text-muted hover:text-primary hover:bg-border rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical size={14} />
                      </button>
                      {openMenu === party._id && (
                        <div className="absolute right-0 top-8 z-30 bg-card border border-border rounded-xl shadow-modal w-36 py-1 animate-slide-up"
                          onMouseLeave={() => setOpenMenu(null)}>
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-border transition-colors"
                            onClick={() => { setModal(party); setOpenMenu(null); }}>
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                            onClick={() => { setConfirm(party); setOpenMenu(null); }}>
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Party form modal */}
      <PartyFormModal
        open={!!modal}
        onClose={closeModal}
        party={modal !== 'create' ? modal : null}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Party"
        message={`Are you sure you want to remove "${confirm?.name}"? This will deactivate the party but retain their invoice history.`}
      />
    </div>
  );
}
