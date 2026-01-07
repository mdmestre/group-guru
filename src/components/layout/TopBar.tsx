/**
 * TopBar - Enterprise Header with Navigation
 * 
 * Features:
 * - Breadcrumbs
 * - Search
 * - Theme toggle
 * - Notifications
 * - User menu
 */

import React from 'react';
import {
  Search,
  Bell,
  Moon,
  Sun,
  ChevronRight,
  Settings,
  User,
  LogOut,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/design-system/useTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopBarProps {
  breadcrumbs?: BreadcrumbItem[];
  showSearch?: boolean;
  title?: string;
  className?: string;
  userMenuItems?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
}

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbs,
  showSearch = true,
  title,
  className,
  userMenuItems = []
}) => {
  const { mode, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 z-30 flex items-center justify-between px-6 transition-colors',
        className
      )}
      style={{
        left: '60px',
        width: 'calc(100% - 60px)'
      }}
    >
      {/* Left side - Logo + Breadcrumbs */}
      <div className="flex items-center gap-4 flex-1">
        {/* Company Logo/Branding */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-neutral-900 dark:text-neutral-50 hidden sm:inline text-sm">Stracta</span>
        </div>

        {/* Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2 ml-4">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div className="flex items-center gap-2">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-700" />
                  )}
                  <a
                    href={item.href}
                    className={cn(
                      'text-sm transition-colors',
                      index === breadcrumbs.length - 1
                        ? 'text-neutral-900 dark:text-neutral-100 font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    )}
                  >
                    {item.label}
                  </a>
                </React.Fragment>
              ))}
            </div>
          ) : title ? (
            <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {title}
            </h1>
          ) : null}
        </div>
      </div>

      {/* Right side - Search, Notifications, Theme, User */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Search Bar */}
        {showSearch && (
          <div className="hidden md:flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 w-40"
            />
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors">
          <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          title={`Mudar para modo ${mode === 'light' ? 'escuro' : 'claro'}`}
        >
          {mode === 'light' ? (
            <Moon className="w-5 h-5 text-neutral-600" />
          ) : (
            <Sun className="w-5 h-5 text-neutral-400" />
          )}
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  João Silva
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Admin
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {userMenuItems.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onClick={item.onClick}
                className="cursor-pointer"
              >
                {item.icon}
                <span>{item.label}</span>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;
