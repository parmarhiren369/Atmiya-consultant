import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Bell, User, LogOut, Moon, Sun, Menu, X, Home, FileText, CheckSquare, Clock, XCircle, DollarSign, Activity, RotateCcw, HelpCircle, Percent, Users, Crown, UserCircle, FolderOpen, UserPlus, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export function Sidebar() {
  const [isCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, teamMember, isTeamMember, pageAccess, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    { path: '/', label: 'Policies', icon: FileText },
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/client-folders', label: 'Client Folders', icon: FolderOpen },
    { path: '/leads', label: 'Leads', icon: UserPlus },
    { path: '/group-heads', label: 'Group Heads', icon: UsersRound },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/reminders', label: 'Reminders', icon: Clock },
    { path: '/lapsed-policies', label: 'Lapsed', icon: XCircle },
    { path: '/claims', label: 'Claims', icon: DollarSign },
    { path: '/commissions', label: 'Commissions', icon: Percent },
    { path: '/activity-log', label: 'Activity Log', icon: Activity },
    { path: '/restore', label: 'Restore', icon: RotateCcw },
    { path: '/profile', label: 'Profile', icon: UserCircle },
    { path: '/support', label: 'Support', icon: HelpCircle },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin Panel', icon: Users }] : []),
  ];
  
  console.log('Team member status:', isTeamMember, 'PageAccess:', pageAccess);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-sharp bg-white dark:bg-gray-800 shadow-md text-slate-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          shadow-lg
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <Link to="/" className="flex items-center justify-center w-full" onClick={() => setIsMobileOpen(false)}>
              {!isCollapsed && (
                <img src="/onclickslogin.png" alt="OnClicks Logo" className="h-16 w-auto object-contain" />
              )}
              {isCollapsed && (
                <img src="/onclickslogin.png" alt="OnClicks Logo" className="h-10 w-auto object-contain" />
              )}
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="p-4 space-y-2 border-b border-gray-200 dark:border-gray-700">
            {(!isTeamMember || pageAccess.includes('/add-policy')) && (
              <Link
                to="/add-policy"
                onClick={() => setIsMobileOpen(false)}
                className={`
                  bg-blue-700 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 text-white px-4 py-3 rounded-sharp 
                  hover:bg-blue-800 dark:hover:from-blue-700 dark:hover:to-indigo-700 transition-all duration-200 
                  flex items-center shadow-sm hover:shadow-md
                  ${isCollapsed ? 'justify-center' : 'space-x-2'}
                `}
              >
                <Plus className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">Add Policy</span>}
              </Link>
            )}
            {!isTeamMember && user?.role !== 'admin' && (user?.subscriptionStatus === 'trial' || user?.subscriptionStatus === 'expired') && (
              <Link
                to="/pricing"
                onClick={() => setIsMobileOpen(false)}
                className={`
                  bg-amber-600 dark:bg-gradient-to-r dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 text-white px-4 py-3 rounded-sharp 
                  hover:bg-amber-700 dark:hover:from-slate-600 dark:hover:via-slate-500 dark:hover:to-slate-600 transition-all duration-200 
                  flex items-center shadow-sm hover:shadow-md dark:border dark:border-slate-500/30
                  ${isCollapsed ? 'justify-center' : 'space-x-2'}
                `}
              >
                <Crown className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">Subscribe Now</span>}
              </Link>
            )}
            <Link
              to="/reminders"
              onClick={() => setIsMobileOpen(false)}
              className={`
                bg-amber-50 dark:bg-orange-900/20 text-amber-700 dark:text-orange-400 px-4 py-3 rounded-sharp 
                hover:bg-amber-100 dark:hover:bg-orange-900/30 transition-colors duration-200 
                flex items-center
                ${isCollapsed ? 'justify-center' : 'space-x-2'}
              `}
            >
              <Bell className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Alerts</span>}
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Team member: check if they have access to this page
              const hasAccess = !isTeamMember || pageAccess.includes(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={hasAccess ? item.path : '#'}
                  onClick={(e) => {
                    if (!hasAccess) {
                      e.preventDefault();
                      toast.error('You do not have access to this page');
                      return;
                    }
                    setIsMobileOpen(false);
                  }}
                  className={`
                    flex items-center px-4 py-3 rounded-sharp text-sm font-medium transition-all duration-200
                    ${isCollapsed ? 'justify-center' : 'space-x-3'}
                    ${!hasAccess ? 'opacity-30 cursor-not-allowed grayscale blur-sm pointer-events-none' : ''}
                    ${
                      isActive(item.path)
                        ? 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm border-l-4 border-blue-700 dark:border-blue-400'
                        : 'text-slate-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700'
                    }
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section - User & Settings */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`
                w-full p-3 rounded-sharp text-slate-600 dark:text-gray-300 
                hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 
                transition-colors duration-200 flex items-center
                ${isCollapsed ? 'justify-center' : 'space-x-3'}
              `}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5 flex-shrink-0" /> : <Moon className="h-5 w-5 flex-shrink-0" />}
              {!isCollapsed && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`
                  w-full flex items-center text-slate-700 dark:text-gray-300 
                  hover:text-blue-700 dark:hover:text-blue-400 px-3 py-2 rounded-sharp 
                  hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors duration-200
                  ${isCollapsed ? 'justify-center' : 'space-x-2'}
                `}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm truncate">
                      {isTeamMember ? teamMember?.fullName : user?.displayName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 capitalize">
                      {isTeamMember ? 'Team Member' : user?.role}
                    </p>
                  </div>
                )}
              </button>

              {userMenuOpen && (
                <div className={`absolute ${isCollapsed ? 'left-full ml-2' : 'left-0'} bottom-0 w-48 bg-white dark:bg-gray-800 rounded-card shadow-lg border border-gray-200 dark:border-gray-700 z-50`}>
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-slate-700 dark:text-gray-300 border-b border-slate-100 dark:border-gray-700">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {isTeamMember ? teamMember?.fullName : user?.displayName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {isTeamMember ? teamMember?.email : user?.email}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 capitalize">
                        {isTeamMember ? 'Team Member' : user?.role}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
