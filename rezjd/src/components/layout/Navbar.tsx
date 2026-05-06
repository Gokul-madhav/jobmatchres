import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Sun, Moon, LogOut, User, Menu, X, FileText } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'

const navLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Job Match', href: '/job-match' },
  { label: 'ATS Builder', href: '/ats-builder' },
]

export function Navbar() {
  const { isDark, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className={cn(
      'sticky top-0 z-40 w-full border-b transition-all duration-300',
      'bg-white/80 border-japandi-border backdrop-blur-md',
      'dark:bg-gothic-bg/80 dark:border-gothic-border'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-japandi-primary dark:bg-gothic-primary flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <span className="font-semibold text-japandi-text dark:text-gothic-text dark:font-serif text-lg">
              RezJD
            </span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                    location.pathname === link.href
                      ? 'bg-japandi-primary/10 text-japandi-primary dark:bg-gothic-primary/20 dark:text-gothic-primary'
                      : 'text-japandi-muted hover:text-japandi-text dark:text-gothic-muted dark:hover:text-gothic-text'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                'p-2 rounded-xl transition-all duration-200',
                'text-japandi-muted hover:text-japandi-text hover:bg-japandi-bg',
                'dark:text-gothic-muted dark:hover:text-gothic-text dark:hover:bg-white/5'
              )}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-japandi-bg dark:bg-white/5">
                    <User size={14} className="text-japandi-muted dark:text-gothic-muted" />
                    <span className="text-sm text-japandi-text dark:text-gothic-text">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-japandi-muted hover:text-red-500 dark:text-gothic-muted dark:hover:text-gothic-accent transition-colors"
                    aria-label="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
                {/* Mobile menu button */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden p-2 rounded-xl text-japandi-muted dark:text-gothic-muted"
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-japandi-text dark:text-gothic-text hover:text-japandi-primary dark:hover:text-gothic-primary transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-japandi-primary text-white dark:bg-gothic-primary hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && user && (
        <div className="md:hidden border-t border-japandi-border dark:border-gothic-border bg-white dark:bg-gothic-card px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                location.pathname === link.href
                  ? 'bg-japandi-primary/10 text-japandi-primary dark:bg-gothic-primary/20 dark:text-gothic-primary'
                  : 'text-japandi-muted dark:text-gothic-muted'
              )}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:text-gothic-accent"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}
