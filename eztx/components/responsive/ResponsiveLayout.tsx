'use client'

import { ReactNode, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ResponsiveLayoutProps {
  children: ReactNode
  className?: string
}

// Hook to detect screen size
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setScreenSize({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Call once to set initial size

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return screenSize
}

// Responsive Container Component
export default function ResponsiveLayout({ children, className = '' }: ResponsiveLayoutProps) {
  const { isMobile, isTablet } = useScreenSize()

  return (
    <div className={`
      w-full min-h-screen
      ${isMobile ? 'px-4 py-4' : isTablet ? 'px-6 py-6' : 'px-8 py-8'}
      ${className}
    `}>
      <div className={`
        mx-auto
        ${isMobile ? 'max-w-full' : isTablet ? 'max-w-4xl' : 'max-w-6xl'}
      `}>
        {children}
      </div>
    </div>
  )
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
}

export function ResponsiveGrid({ 
  children, 
  className = '',
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 'gap-4', tablet: 'gap-6', desktop: 'gap-8' }
}: ResponsiveGridProps) {
  const { isMobile, isTablet } = useScreenSize()

  const gridCols = isMobile 
    ? `grid-cols-${cols.mobile}` 
    : isTablet 
      ? `grid-cols-${cols.tablet}` 
      : `grid-cols-${cols.desktop}`

  const gridGap = isMobile 
    ? gap.mobile 
    : isTablet 
      ? gap.tablet 
      : gap.desktop

  return (
    <div className={`grid ${gridCols} ${gridGap} ${className}`}>
      {children}
    </div>
  )
}

// Responsive Stack Component (vertical layout with responsive spacing)
interface ResponsiveStackProps {
  children: ReactNode
  className?: string
  spacing?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
}

export function ResponsiveStack({ 
  children, 
  className = '',
  spacing = { mobile: 'space-y-4', tablet: 'space-y-6', desktop: 'space-y-8' }
}: ResponsiveStackProps) {
  const { isMobile, isTablet } = useScreenSize()

  const stackSpacing = isMobile 
    ? spacing.mobile 
    : isTablet 
      ? spacing.tablet 
      : spacing.desktop

  return (
    <div className={`flex flex-col ${stackSpacing} ${className}`}>
      {children}
    </div>
  )
}

// Responsive Modal Component
interface ResponsiveModalProps {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string
  className?: string
}

export function ResponsiveModal({ 
  children, 
  isOpen, 
  onClose, 
  title,
  className = '' 
}: ResponsiveModalProps) {
  const { isMobile } = useScreenSize()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={`
              fixed z-50 bg-white shadow-strong
              ${isMobile 
                ? 'inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]' 
                : 'top-1/2 left-1/2 rounded-2xl max-w-lg w-full mx-4'
              }
              ${className}
            `}
            initial={isMobile 
              ? { y: '100%' } 
              : { x: '-50%', y: '-50%', scale: 0.95, opacity: 0 }
            }
            animate={isMobile 
              ? { y: 0 } 
              : { x: '-50%', y: '-50%', scale: 1, opacity: 1 }
            }
            exit={isMobile 
              ? { y: '100%' } 
              : { x: '-50%', y: '-50%', scale: 0.95, opacity: 0 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Content */}
            <div className={`
              overflow-y-auto
              ${title ? 'p-4 sm:p-6' : 'p-4 sm:p-6'}
              ${isMobile ? 'max-h-[calc(90vh-4rem)]' : 'max-h-[80vh]'}
            `}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Responsive Navigation Component
interface ResponsiveNavProps {
  items: Array<{
    label: string
    value: string
    icon?: ReactNode
  }>
  activeItem: string
  onItemChange: (value: string) => void
  className?: string
}

export function ResponsiveNav({ 
  items, 
  activeItem, 
  onItemChange, 
  className = '' 
}: ResponsiveNavProps) {
  const { isMobile } = useScreenSize()

  if (isMobile) {
    // Mobile: Bottom tab bar
    return (
      <div className={`
        fixed bottom-0 left-0 right-0 z-30
        bg-white border-t border-gray-200 shadow-strong
        ${className}
      `}>
        <div className="flex">
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => onItemChange(item.value)}
              className={`
                flex-1 flex flex-col items-center justify-center py-2 px-1
                transition-colors duration-200
                ${activeItem === item.value 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {item.icon && (
                <div className="w-6 h-6 mb-1">
                  {item.icon}
                </div>
              )}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Desktop/Tablet: Horizontal tab bar
  return (
    <div className={`flex space-x-1 bg-gray-100 rounded-xl p-1 ${className}`}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onItemChange(item.value)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg font-medium
            transition-all duration-200
            ${activeItem === item.value 
              ? 'bg-white text-primary-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          {item.icon && <div className="w-5 h-5">{item.icon}</div>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}