import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (mode === 'register' && !name.trim()) e.name = 'Name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email'
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Minimum 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast.success('Welcome back!')
        navigate('/dashboard')
      } else {
        await register(email, password, name)
        toast.success('Account created!')
        navigate('/onboarding')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      if (msg.includes('user-not-found') || msg.includes('wrong-password')) {
        toast.error('Invalid email or password')
      } else if (msg.includes('email-already-in-use')) {
        toast.error('Email already registered')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={cn(
        'rounded-2xl border p-8 shadow-japandi-md',
        'bg-white border-japandi-border',
        'dark:bg-gothic-card dark:border-gothic-border dark:shadow-gothic-glow'
      )}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-japandi-muted dark:text-gothic-muted mt-2">
            {mode === 'login'
              ? 'Sign in to your RezJD account'
              : 'Start optimizing your resume today'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <Input
              label="Full Name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              icon={<User size={16} />}
            />
          )}
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={<Mail size={16} />}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              icon={<Lock size={16} />}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-9 text-japandi-muted dark:text-gothic-muted hover:text-japandi-text dark:hover:text-gothic-text"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-japandi-muted dark:text-gothic-muted mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <Link
            to={mode === 'login' ? '/register' : '/login'}
            className="text-japandi-primary dark:text-gothic-primary font-medium hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  )
}
