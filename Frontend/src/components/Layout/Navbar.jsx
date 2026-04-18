import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import {
  Shield, Menu, X, LogOut, User, LayoutDashboard,
  MapPin, FileWarning, Wifi, WifiOff
} from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Safety Map', icon: MapPin },
    { path: '/report', label: 'Report Incident', icon: FileWarning },
  ];

  if (isAdmin) {
    navLinks.push({ path: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold font-display text-white leading-tight">SafetyGuard</h1>
              <p className="text-[10px] text-dark-400 font-medium tracking-wide uppercase">Mumbai Intelligence</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(path)
                    ? 'bg-primary-600/20 text-primary-300'
                    : 'text-dark-300 hover:text-white hover:bg-dark-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'Live' : 'Offline'}
            </div>

            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/60 border border-dark-700/50">
                  <User className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-dark-200">{user?.name}</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 bg-primary-600/30 text-primary-300 text-[10px] font-bold rounded uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <button onClick={handleLogout} className="p-2 text-dark-400 hover:text-red-400 rounded-lg hover:bg-dark-700/50 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-secondary !py-2 !px-4 text-sm">Log in</Link>
                <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">Sign up</Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-dark-300 hover:text-white rounded-lg hover:bg-dark-700/50"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-dark-900/95 backdrop-blur-xl border-b border-dark-700/50 animate-slide-up">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(path)
                    ? 'bg-primary-600/20 text-primary-300'
                    : 'text-dark-300 hover:text-white hover:bg-dark-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <hr className="border-dark-700/50 my-3" />
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 text-dark-300 text-sm">
                  <User className="w-4 h-4" />
                  {user?.name}
                  {isAdmin && <span className="badge-pending ml-1">Admin</span>}
                </div>
                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10">
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1 text-center !py-2.5 text-sm">Log in</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1 text-center !py-2.5 text-sm">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
