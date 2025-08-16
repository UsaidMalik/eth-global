'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FeeEstimate } from '@/types'

interface FeeEstimatorProps {
  amount: number
  currency: string
  onFeeUpdate?: (fees: FeeEstimate) => void
}

interface NetworkCondition {
  status: 'low' | 'medium' | 'high'
  label: string
  color: string
}

export default function FeeEstimator({ amount, currency, onFeeUpdate }: FeeEstimatorProps) {
  const [fees, setFees] = useState<FeeEstimate>({
    onRampFee: 0,
    blockchainFee: 0,
    offRampFee: 0,
    totalFee: 0,
    estimatedTime: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition>({
    status: 'medium',
    label: 'Normal',
    color: 'text-warning-600'
  })

  // Mock fee calculation based on amount and current network conditions
  const calculateFees = async (paymentAmount: number): Promise<FeeEstimate> => {
    if (paymentAmount <= 0) {
      return {
        onRampFee: 0,
        blockchainFee: 0,
        offRampFee: 0,
        totalFee: 0,
        estimatedTime: 0
      }
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300))

    // Mock network condition that changes over time
    const conditions: NetworkCondition[] = [
      { status: 'low', label: 'Fast', color: 'text-success-600' },
      { status: 'medium', label: 'Normal', color: 'text-warning-600' },
      { status: 'high', label: 'Congested', color: 'text-error-600' }
    ]
    
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)]
    setNetworkCondition(randomCondition)

    // Calculate fees based on amount and network conditions
    const baseOnRampFee = paymentAmount * 0.015 // 1.5%
    const baseBlockchainFee = randomCondition.status === 'low' ? 2.5 : 
                             randomCondition.status === 'medium' ? 5.0 : 8.5
    const baseOffRampFee = paymentAmount * 0.01 // 1%

    // Add some randomness to make it feel more realistic
    const onRampFee = Math.round((baseOnRampFee + (Math.random() - 0.5) * 0.5) * 100) / 100
    const blockchainFee = Math.round((baseBlockchainFee + (Math.random() - 0.5) * 1.0) * 100) / 100
    const offRampFee = Math.round((baseOffRampFee + (Math.random() - 0.5) * 0.3) * 100) / 100
    const totalFee = Math.round((onRampFee + blockchainFee + offRampFee) * 100) / 100

    // Estimate time based on network conditions (in minutes)
    const baseTime = randomCondition.status === 'low' ? 3 : 
                     randomCondition.status === 'medium' ? 8 : 15
    const estimatedTime = baseTime + Math.floor(Math.random() * 5)

    return {
      onRampFee,
      blockchainFee,
      offRampFee,
      totalFee,
      estimatedTime
    }
  }

  // Update fees when amount changes
  useEffect(() => {
    const updateFees = async () => {
      if (amount <= 0) {
        const emptyFees = {
          onRampFee: 0,
          blockchainFee: 0,
          offRampFee: 0,
          totalFee: 0,
          estimatedTime: 0
        }
        setFees(emptyFees)
        onFeeUpdate?.(emptyFees)
        return
      }

      setIsLoading(true)
      try {
        const newFees = await calculateFees(amount)
        setFees(newFees)
        onFeeUpdate?.(newFees)
      } catch (error) {
        console.error('Error calculating fees:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(updateFees, 500) // Debounce updates
    return () => clearTimeout(timeoutId)
  }, [amount, currency, onFeeUpdate])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatTime = (minutes: number) => {
    if (minutes === 0) return 'N/A'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Fee Estimate</h3>
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
          )}
        </div>

        {amount > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {/* Fee Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">On-ramp fee (1.5%)</span>
                <span className="font-medium text-gray-900">
                  {isLoading ? '...' : formatCurrency(fees.onRampFee)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Blockchain fee</span>
                <span className="font-medium text-gray-900">
                  {isLoading ? '...' : formatCurrency(fees.blockchainFee)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Off-ramp fee (1%)</span>
                <span className="font-medium text-gray-900">
                  {isLoading ? '...' : formatCurrency(fees.offRampFee)}
                </span>
              </div>
              
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total fees</span>
                  <span className="font-bold text-lg text-gray-900">
                    {isLoading ? '...' : formatCurrency(fees.totalFee)}
                  </span>
                </div>
              </div>
            </div>

            {/* Network Condition and Time Estimate */}
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Network status</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    networkCondition.status === 'low' ? 'bg-success-500' :
                    networkCondition.status === 'medium' ? 'bg-warning-500' : 'bg-error-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${networkCondition.color}`}>
                    {networkCondition.label}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estimated time</span>
                <span className="text-sm font-medium text-gray-900">
                  {isLoading ? '...' : formatTime(fees.estimatedTime)}
                </span>
              </div>
            </div>

            {/* Total Amount */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-2 sm:p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium text-primary-800">
                  Total amount (including fees)
                </span>
                <span className="text-base sm:text-lg font-bold text-primary-900">
                  {isLoading ? '...' : formatCurrency(amount + fees.totalFee)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              Enter an amount to see fee estimates
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}