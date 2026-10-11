import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Video, Camera, Radio, Users, DoorOpen, Bell, FileWarning, BarChart3, ShieldAlert, HardDrive, Settings } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live-monitoring', label: 'Live Monitoring', icon: Video },
  { to: '/image-analysis', label: 'Image Analysis', icon: Camera },
  { to: '/cameras', label: 'Cameras', icon: Camera },
  { to: '/sensors', label: 'Sensors', icon: Radio },
  { to: '/workers', label: 'Workers', icon: Users },
  { to: '/access', label: 'Access Log', icon: DoorOpen },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/incidents', label: 'Incidents', icon: FileWarning },
  { to: '/restricted-zones', label: 'Restricted Zones', icon: ShieldAlert },
  { to: '/devices', label: 'Devices', icon: HardDrive },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-line bg-panel h-full flex flex-col">
      <div className="px-4 py-4 border-b border-line">
        <div className="font-semibold tracking-tight">Industrial Guardian</div>
        <div className="text-xs text-slate-500">Safety Platform</div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-2.5 px-4 py-2 text-sm ${isActive ? 'bg-panel2 text-safety border-r-2 border-safety' : 'text-slate-400 hover:text-slate-200 hover:bg-panel2/60'}`}>
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
