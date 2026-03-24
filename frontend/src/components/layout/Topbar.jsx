import { useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import { Bell, HelpCircle, ChevronDown } from 'lucide-react';

export default function Topbar({ title, actions }) {
  const user      = useSelector(selectUser);
  const activeBiz = useSelector(selectActiveBusiness);
  const initials  = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'BF';

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-5 sticky top-0 z-20">
      {/* Left: Page title */}
      <div className="flex items-center gap-3">
        <h1 className="font-display font-semibold text-base text-primary">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <button className="btn-ghost p-2 text-muted" aria-label="Help">
          <HelpCircle size={16} />
        </button>
        <button className="btn-ghost p-2 text-muted relative" aria-label="Notifications">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
        </button>

        {/* User avatar + name */}
        <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-card transition-colors border border-transparent hover:border-border">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold font-display">
            {initials}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-primary leading-none">{user?.name?.split(' ')[0]}</p>
            {activeBiz && <p className="text-[10px] text-muted leading-none mt-0.5 truncate max-w-[100px]">{activeBiz.name}</p>}
          </div>
          <ChevronDown size={12} className="text-muted" />
        </button>
      </div>
    </header>
  );
}
