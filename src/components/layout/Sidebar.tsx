import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  MessageSquare,
  Send,
  Settings,
  LogOut,
  LayoutGrid,
  Zap,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number | string;
}

const mainNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
    href: '/app/dashboard'
  }
];

const operationalItems: NavItem[] = [
  {
    id: 'connections',
    label: 'Conexões',
    icon: <LayoutGrid className="w-5 h-5" />,
    href: '/app'
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: <Users className="w-5 h-5" />,
    href: '/app/crm'
  },
  {
    id: 'conversations',
    label: 'Conversas',
    icon: <MessageSquare className="w-5 h-5" />,
    href: '/app/conversations'
  },
  {
    id: 'campaigns',
    label: 'Campanhas',
    icon: <Send className="w-5 h-5" />,
    href: '/app/campaigns',
    badge: 0
  }
];

const systemItems: NavItem[] = [
  {
    id: 'settings',
    label: 'Configurações',
    icon: <Settings className="w-5 h-5" />,
    href: '/app/settings'
  }
];

interface SidebarProps {
  className?: string;
}

const isActive = (href: string, pathname: string) => {
  if (href === '/app') {
    return pathname === '/app' || pathname === '/app/';
  }
  return pathname === href || pathname.startsWith(href + '/');
};

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();
  const { collapsed, toggle } = useSidebar();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/auth/login';
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Usuário';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen',
        'bg-white border-r border-neutral-200',
        'flex flex-col z-50',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-72',
        className
      )}
    >
      {/* Header - Logo & Branding */}
      <div className={cn(
        'h-16 px-6 border-b border-neutral-200',
        'flex items-center gap-3 shrink-0',
        'transition-all duration-300'
      )}>
        <div className={cn(
          'w-10 h-10 rounded-lg',
          'bg-gradient-to-br from-primary-500 to-primary-600',
          'flex items-center justify-center shadow-md shadow-primary/20',
          'flex-shrink-0'
        )}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0 animate-fade-in">
            <span className="text-sm font-bold text-neutral-900 truncate">Stracta</span>
            <span className="text-xs text-neutral-500">SaaS</span>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <div className="absolute top-16 right-0 translate-x-1/2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          className={cn(
            'h-8 w-8 rounded-full',
            'bg-white border-neutral-200 shadow-md',
            'hover:bg-neutral-50 hover:border-primary-300',
            'transition-all duration-200'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-neutral-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-neutral-600" />
          )}
        </Button>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-8 scrollbar-thin">
        {/* Main Navigation Section */}
        <div className="space-y-2">
          {!collapsed && (
            <p className="px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Principal
            </p>
          )}
          {mainNavItems.map((item) => {
            const active = isActive(item.href, location.pathname);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg',
                  'text-sm font-medium transition-all duration-150',
                  'group relative',
                  active
                    ? 'bg-primary-50 text-primary-600 shadow-sm shadow-primary/10'
                    : 'text-neutral-700 hover:bg-neutral-100'
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className={cn(
                  'flex-shrink-0 w-5 h-5 flex items-center justify-center',
                  active && 'text-primary-600'
                )}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-grow">{item.label}</span>
                    {item.badge && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Operational Section */}
        <div className="space-y-2">
          {!collapsed && (
            <p className="px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Operacional
            </p>
          )}
          {operationalItems.map((item) => {
            const active = isActive(item.href, location.pathname);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg',
                  'text-sm font-medium transition-all duration-150',
                  'group relative',
                  active
                    ? 'bg-primary-50 text-primary-600 shadow-sm shadow-primary/10'
                    : 'text-neutral-700 hover:bg-neutral-100'
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className={cn(
                  'flex-shrink-0 w-5 h-5 flex items-center justify-center',
                  active && 'text-primary-600'
                )}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-grow">{item.label}</span>
                    {item.badge && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* System Section */}
        <div className="space-y-2">
          {!collapsed && (
            <p className="px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Sistema
            </p>
          )}
          {systemItems.map((item) => {
            const active = isActive(item.href, location.pathname);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg',
                  'text-sm font-medium transition-all duration-150',
                  'group relative',
                  active
                    ? 'bg-primary-50 text-primary-600 shadow-sm shadow-primary/10'
                    : 'text-neutral-700 hover:bg-neutral-100'
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className={cn(
                  'flex-shrink-0 w-5 h-5 flex items-center justify-center',
                  active && 'text-primary-600'
                )}>
                  {item.icon}
                </div>
                {!collapsed && <span className="flex-grow">{item.label}</span>}
                {collapsed && active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer - User & Logout */}
      <div className="border-t border-neutral-200 p-4 shrink-0 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{userName}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
              {userInitials}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
            'text-sm font-medium transition-all duration-150',
            'text-neutral-700 hover:bg-red-50 hover:text-red-600',
            'group'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="flex-grow text-left">Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
