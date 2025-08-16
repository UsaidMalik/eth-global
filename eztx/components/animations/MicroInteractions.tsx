'use client'

import { motion, MotionProps } from 'framer-motion'
import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

// Animated Button Component
interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
}

export function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Loading...',
  className = '',
  disabled,
  onClick,
  ...props
}: AnimatedButtonProps) {
  const baseClasses = 'font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 shadow-medium hover:shadow-strong',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500',
    success: 'bg-success-600 hover:bg-success-700 text-white focus:ring-success-500 shadow-medium hover:shadow-strong',
    error: 'bg-error-600 hover:bg-error-700 text-white focus:ring-error-500 shadow-medium hover:shadow-strong',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  }

  const isDisabled = disabled || isLoading

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      whileHover={!isDisabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      disabled={isDisabled}
      onClick={onClick}
      type={props.type || 'button'}
    >
      <motion.div
        className="flex items-center justify-center space-x-2"
        initial={false}
        animate={isLoading ? { opacity: 0.7 } : { opacity: 1 }}
      >
        {isLoading && (
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <span>{isLoading ? loadingText : children}</span>
      </motion.div>
    </motion.button>
  )
}

// Animated Input Component
interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  icon?: ReactNode
}

export function AnimatedInput({
  label,
  error,
  success,
  icon,
  className = '',
  onChange,
  onFocus,
  onBlur,
  ...props
}: AnimatedInputProps) {
  const hasError = !!error
  const hasSuccess = !!success

  return (
    <div className="space-y-2">
      {label && (
        <motion.label
          className="block text-sm font-medium text-gray-700"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {label}
        </motion.label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        
        <input
          className={`
            block w-full px-4 py-3 border rounded-xl text-base
            focus:ring-2 focus:ring-offset-0 transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${hasError 
              ? 'border-error-500 focus:border-error-500 focus:ring-error-500 bg-error-50' 
              : hasSuccess
                ? 'border-success-500 focus:border-success-500 focus:ring-success-500 bg-success-50'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }
            ${className}
          `}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          {...props}
        />
      </div>
      
      {(error || success) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={`text-sm ${hasError ? 'text-error-600' : 'text-success-600'}`}
        >
          {error || success}
        </motion.div>
      )}
    </div>
  )
}

// Animated Card Component
interface AnimatedCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export function AnimatedCard({ 
  children, 
  className = '', 
  hover = true,
  delay = 0 
}: AnimatedCardProps) {
  return (
    <motion.div
      className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { 
        y: -4, 
        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 2px 10px -2px rgba(0, 0, 0, 0.04)' 
      } : {}}
    >
      {children}
    </motion.div>
  )
}

// Floating Action Button
interface FloatingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export function FloatingButton({ 
  children, 
  position = 'bottom-right',
  className = '',
  onClick,
  ...props 
}: FloatingButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  }

  return (
    <motion.button
      className={`
        fixed ${positionClasses[position]} z-50
        w-14 h-14 bg-primary-600 text-white rounded-full
        shadow-strong hover:shadow-xl
        flex items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${className}
      `}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={onClick}
      type="button"
    >
      {children}
    </motion.button>
  )
}

// Notification Toast
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export function Toast({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose,
  duration = 5000 
}: ToastProps) {
  const typeClasses = {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <motion.div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        border rounded-xl p-4 shadow-strong
        ${typeClasses[type]}
      `}
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={isVisible ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex items-start space-x-3">
        <span className="text-lg">{icons[type]}</span>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-current hover:opacity-70 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Auto-dismiss progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-b-xl"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        onAnimationComplete={onClose}
      />
    </motion.div>
  )
}

// Skeleton Loader
interface SkeletonProps {
  className?: string
  lines?: number
  avatar?: boolean
}

export function Skeleton({ className = '', lines = 1, avatar = false }: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {avatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      )}
      
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          className={`h-4 bg-gray-300 rounded mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            delay: index * 0.1 
          }}
        />
      ))}
    </div>
  )
}