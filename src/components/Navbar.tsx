import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Plus, Bell, User, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
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
    { path: '/', label: 'Policies' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/tasks', label: 'Tasks' },
    { path: '/reminders', label: 'Reminders' },
    { path: '/lapsed-policies', label: 'Lapsed' },
    { path: '/claims', label: 'Claims' },
    { path: '/activity-log', label: 'Activity Log' },
    { path: '/restore', label: 'Restore' },
    { path: '/support', label: 'Support' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50 border-b border-gray-100 dark:border-gray-700 transition-colors duration-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/LOGO.PNG" alt="Atmiya Consultant Logo" className="h-12 w-auto object-contain" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2 flex-1 justify-end">
            {/* Quick Add Policy Button */}
            <Link
              to="/add-policy"
              className="bg-blue-700 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 text-white px-2 xl:px-3 py-2 rounded-sharp hover:bg-blue-800 dark:hover:from-blue-700 dark:hover:to-indigo-700 transition-all duration-200 flex items-center space-x-1 xl:space-x-2 shadow-sm hover:shadow-md mr-2"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium text-sm hidden xl:block">Add Policy</span>
              <span className="font-medium text-sm xl:hidden">Add</span>
            </Link>
            
            {/* Navigation Links */}
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-1 xl:px-3 py-2 rounded-sharp text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Alerts Button */}
            <Link
              to="/reminders"
              className="bg-amber-50 dark:bg-orange-900/20 text-amber-700 dark:text-orange-400 px-2 xl:px-3 py-2 rounded-sharp hover:bg-amber-100 dark:hover:bg-orange-900/30 transition-colors duration-200 flex items-center space-x-1 ml-2"
            >
              <Bell className="h-4 w-4" />
              <span className="font-medium text-sm hidden xl:block">Alerts</span>
            </Link>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-sharp text-slate-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors duration-200 ml-2"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* User Menu */}
            <div className="relative ml-4" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 text-slate-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 px-3 py-2 rounded-sharp hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <User className="h-4 w-4" />
                <span className="font-medium text-sm hidden xl:block">{user?.displayName}</span>
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-card shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">{user?.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            {/* Mobile Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-sharp text-slate-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 focus:outline-none focus:text-blue-700 dark:focus:text-blue-400 mr-2"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 focus:outline-none focus:text-blue-700 dark:focus:text-blue-400 p-2 rounded-sharp hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-screen overflow-y-auto">
          {/* Mobile Quick Actions */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-2">
              <Link
                to="/add-policy"
                onClick={() => setIsOpen(false)}
                className="bg-blue-700 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 text-white px-4 py-3 rounded-sharp hover:bg-blue-800 dark:hover:from-blue-700 dark:hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">Add New Policy</span>
              </Link>
              <Link
                to="/reminders"
                onClick={() => setIsOpen(false)}
                className="bg-amber-50 dark:bg-orange-900/20 text-amber-700 dark:text-orange-400 px-4 py-3 rounded-sharp hover:bg-amber-100 dark:hover:bg-orange-900/30 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span className="font-medium">View Alerts</span>
              </Link>
            </div>
          </div>
          
          {/* Mobile Navigation Links */}
          <div className="px-2 pt-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-sharp text-base font-medium transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm border-l-4 border-blue-600 dark:border-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Mobile User Info */}
            <div className="mt-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user?.displayName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sharp transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}