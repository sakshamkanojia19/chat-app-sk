
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, MessageCircle } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-morphism">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <MessageCircle className="w-8 h-8 text-chat-primary" />
          <span className="text-xl font-semibold text-chat-dark">FlowChat</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-chat-dark hover:text-chat-primary transition-colors">
                Dashboard
              </Link>
              <div className="relative group">
                <button className="flex items-center space-x-2">
                  <div className="relative w-8 h-8">
                    <img 
                      src={user?.avatar || 'https://via.placeholder.com/40'} 
                      alt={user?.name || 'User'} 
                      className="avatar w-8 h-8"
                    />
                    <span className="status-online"></span>
                  </div>
                  <span className="text-chat-dark">{user?.name}</span>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 origin-top-right glass-card opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2 shadow-lg rounded-xl">
                  <div className="py-1">
                    <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-chat-dark hover:bg-gray-100 rounded-lg">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                    <button 
                      onClick={logout}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-chat-dark hover:text-chat-primary transition-colors">
                Login
              </Link>
              <Link to="/signup" className="btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden" onClick={toggleMenu}>
          {isMenuOpen ? (
            <X className="w-6 h-6 text-chat-dark" />
          ) : (
            <Menu className="w-6 h-6 text-chat-dark" />
          )}
        </button>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden"
          >
            <div className="container mx-auto px-6 py-4 flex flex-col space-y-4 pb-6">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-3 py-2">
                    <img 
                      src={user?.avatar || 'https://via.placeholder.com/40'} 
                      alt={user?.name || 'User'} 
                      className="avatar w-10 h-10"
                    />
                    <div>
                      <p className="font-medium text-chat-dark">{user?.name}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  <Link 
                    to="/dashboard" 
                    className="py-2 text-chat-dark" 
                    onClick={closeMenu}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/profile" 
                    className="py-2 text-chat-dark" 
                    onClick={closeMenu}
                  >
                    Profile
                  </Link>
                  <button 
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="py-2 text-left text-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="py-2 text-chat-dark" 
                    onClick={closeMenu}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/signup" 
                    className="py-2 text-chat-dark" 
                    onClick={closeMenu}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
