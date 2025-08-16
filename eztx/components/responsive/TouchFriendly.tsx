'use client'

import { motion } from 'framer-motion'
import { ReactNode, TouchEvent, useState } from 'react'

interface TouchFriendlyProps {
  children: ReactNode
  onTap?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
  disabled?: boolean
}

export default function TouchFriendly({
  children,
  onTap,
  onSwipeLeft,
  onSwipeRight,
  className = '',
  disabled = false
}: TouchFriendlyProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const minSwipeDistance = 50

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled) return
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchEnd = () => {
    if (disabled || !touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

    // Only trigger swipe if it's primarily horizontal
    if (!isVerticalSwipe) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft()
      } else if (isRightSwipe && onSwipeRight) {
        onSwipeRight()
      }
    }

    // If no swipe detected and distance is small, treat as tap
    if (Math.abs(distanceX) < 10 && Math.abs(distanceY) < 10 && onTap) {
      onTap()
    }
  }

  return (
    <motion.div
      className={`touch-manipulation ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={disabled ? undefined : onTap}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  )
}

// Swipeable Card Component
interface SwipeableCardProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: ReactNode
  rightAction?: ReactNode
  className?: string
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className = ''
}: SwipeableCardProps) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background Actions */}
      {leftAction && (
        <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-error-500 text-white">
          {leftAction}
        </div>
      )}
      {rightAction && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-success-500 text-white">
          {rightAction}
        </div>
      )}

      {/* Main Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false)
          const threshold = 50
          
          if (info.offset.x > threshold && onSwipeRight) {
            onSwipeRight()
          } else if (info.offset.x < -threshold && onSwipeLeft) {
            onSwipeLeft()
          }
        }}
        onDrag={(_, info) => setDragX(info.offset.x)}
        className={`bg-white relative z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ x: dragX }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Pull to Refresh Component
interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  className?: string
}

export function PullToRefresh({ children, onRefresh, className = '' }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [startY, setStartY] = useState(0)

  const maxPullDistance = 100
  const triggerDistance = 60

  const handleTouchStart = (e: TouchEvent) => {
    setStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: TouchEvent) => {
    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY)
    
    // Only allow pull down when at top of scroll
    if (window.scrollY === 0 && distance > 0) {
      e.preventDefault()
      setPullDistance(Math.min(distance, maxPullDistance))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > triggerDistance && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
  }

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      {pullDistance > 0 && (
        <motion.div
          className="flex items-center justify-center py-4 text-primary-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ height: pullDistance }}
        >
          {isRefreshing ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          ) : (
            <motion.div
              animate={{ rotate: pullDistance > triggerDistance ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ↓
            </motion.div>
          )}
        </motion.div>
      )}
      
      {children}
    </div>
  )
}