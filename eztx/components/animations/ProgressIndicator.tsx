'use client'

import { motion } from 'framer-motion'
import { TransactionStatus } from '@/types'

interface ProgressIndicatorProps {
  status: TransactionStatus
  className?: string
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface ProgressStep {
  key: TransactionStatus
  label: string
  icon: string
}

const progressSteps: ProgressStep[] = [
  { key: TransactionStatus.PENDING, label: 'Initiated', icon: '🚀' },
  { key: TransactionStatus.ON_RAMPING, label: 'On-ramping', icon: '💰' },
  { key: TransactionStatus.CONVERTING, label: 'Converting', icon: '🔄' },
  { key: TransactionStatus.TRANSFERRING, label: 'Transferring', icon: '⚡' },
  { key: TransactionStatus.OFF_RAMPING, label: 'Off-ramping', icon: '🏦' },
  { key: TransactionStatus.COMPLETED, label: 'Completed', icon: '✅' }
]

const sizeClasses = {
  sm: {
    container: 'h-2',
    step: 'w-6 h-6 text-xs',
    label: 'text-xs',
    line: 'h-0.5'
  },
  md: {
    container: 'h-3',
    step: 'w-8 h-8 text-sm',
    label: 'text-sm',
    line: 'h-1'
  },
  lg: {
    container: 'h-4',
    step: 'w-10 h-10 text-base',
    label: 'text-base',
    line: 'h-1.5'
  }
}

export default function ProgressIndicator({ 
  status, 
  className = '', 
  showLabels = true,
  size = 'md'
}: ProgressIndicatorProps) {
  const currentStepIndex = progressSteps.findIndex(step => step.key === status)
  const isCompleted = status === TransactionStatus.COMPLETED
  const isFailed = status === TransactionStatus.FAILED
  const classes = sizeClasses[size]

  const getStepState = (index: number) => {
    if (isFailed && index === currentStepIndex) return 'failed'
    if (isCompleted || index < currentStepIndex) return 'completed'
    if (index === currentStepIndex) return 'active'
    return 'pending'
  }

  const getStepColors = (state: string) => {
    switch (state) {
      case 'completed':
        return 'bg-success-500 text-white border-success-500'
      case 'active':
        return 'bg-primary-500 text-white border-primary-500'
      case 'failed':
        return 'bg-error-500 text-white border-error-500'
      default:
        return 'bg-gray-200 text-gray-500 border-gray-300'
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className="relative">
        <div className={`w-full ${classes.container} bg-gray-200 rounded-full overflow-hidden`}>
          <motion.div
            className={`${classes.container} rounded-full ${
              isFailed ? 'bg-error-500' : 'bg-gradient-to-r from-primary-500 to-success-500'
            }`}
            initial={{ width: 0 }}
            animate={{ 
              width: isFailed 
                ? `${((currentStepIndex + 1) / progressSteps.length) * 100}%`
                : `${((currentStepIndex + 1) / progressSteps.length) * 100}%`
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>

        {/* Animated Progress Indicator */}
        {!isCompleted && !isFailed && (
          <motion.div
            className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{ width: '30%' }}
            />
          </motion.div>
        )}
      </div>

      {/* Step Indicators */}
      {showLabels && (
        <div className="flex justify-between items-center mt-4">
          {progressSteps.map((step, index) => {
            const state = getStepState(index)
            const colors = getStepColors(state)
            
            return (
              <div key={step.key} className="flex flex-col items-center space-y-2">
                <motion.div
                  className={`${classes.step} rounded-full border-2 flex items-center justify-center font-medium ${colors}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: state === 'active' ? 1.1 : 1, 
                    opacity: 1 
                  }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.1,
                    type: 'spring',
                    stiffness: 300
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  {state === 'completed' ? (
                    <motion.svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : state === 'failed' ? (
                    <motion.svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </motion.svg>
                  ) : state === 'active' ? (
                    <motion.div
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </motion.div>
                
                <motion.span
                  className={`${classes.label} font-medium text-center max-w-16 ${
                    state === 'active' ? 'text-primary-600' :
                    state === 'completed' ? 'text-success-600' :
                    state === 'failed' ? 'text-error-600' :
                    'text-gray-500'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                >
                  {step.label}
                </motion.span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Circular Progress Indicator
export function CircularProgress({ 
  status, 
  className = '', 
  size = 120 
}: { 
  status: TransactionStatus
  className?: string
  size?: number 
}) {
  const currentStepIndex = progressSteps.findIndex(step => step.key === status)
  const progress = ((currentStepIndex + 1) / progressSteps.length) * 100
  const isCompleted = status === TransactionStatus.COMPLETED
  const isFailed = status === TransactionStatus.FAILED
  
  const circumference = 2 * Math.PI * (size / 2 - 10)
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-200"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeLinecap="round"
          className={
            isFailed ? 'text-error-500' :
            isCompleted ? 'text-success-500' :
            'text-primary-500'
          }
          style={{
            strokeDasharray,
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="text-2xl font-bold text-gray-900"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {Math.round(progress)}%
          </motion.div>
          <motion.div
            className="text-xs text-gray-500 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {progressSteps[currentStepIndex]?.label || 'Processing'}
          </motion.div>
        </div>
      </div>
    </div>
  )
}