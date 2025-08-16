'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PaymentRequest } from '@/types'
import { useENS, useENSValidation } from '@/hooks/useENS'

interface PaymentFormProps {
  onSubmit: (payment: PaymentRequest) => void
  isLoading: boolean
}

interface FormErrors {
  amount?: string
  recipientAddress?: string
  general?: string
}

export default function PaymentForm({ onSubmit, isLoading }: PaymentFormProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [recipientInput, setRecipientInput] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  
  // Use the ENS hook
  const { 
    resolvedAddress, 
    resolvedENS, 
    isResolving: isResolvingENS, 
    error: ensError, 
    resolveENS, 
    clearResults 
  } = useENS()
  
  const { validateENSName } = useENSValidation()

  // ENS resolution effect
  useEffect(() => {
    const handleInputChange = async () => {
      if (!recipientInput.trim()) {
        clearResults()
        setErrors(prev => ({ ...prev, recipientAddress: undefined }))
        return
      }

      // Check if input looks like an ENS name
      if (recipientInput.includes('.eth')) {
        if (validateENSName(recipientInput)) {
          try {
            await resolveENS(recipientInput)
            setErrors(prev => ({ ...prev, recipientAddress: undefined }))
          } catch (error) {
            // Error is handled by the useENS hook
          }
        } else {
          setErrors(prev => ({ 
            ...prev, 
            recipientAddress: 'Invalid ENS name format' 
          }))
        }
      } else if (recipientInput.startsWith('0x') && recipientInput.length === 42) {
        // Validate Ethereum address format
        if (/^0x[a-fA-F0-9]{40}$/.test(recipientInput)) {
          clearResults()
          setErrors(prev => ({ ...prev, recipientAddress: undefined }))
        } else {
          clearResults()
          setErrors(prev => ({ 
            ...prev, 
            recipientAddress: 'Invalid wallet address format' 
          }))
        }
      } else {
        clearResults()
        if (recipientInput.length > 0) {
          setErrors(prev => ({ 
            ...prev, 
            recipientAddress: 'Please enter a valid ENS name or wallet address' 
          }))
        }
      }
    }

    const timeoutId = setTimeout(handleInputChange, 300)
    return () => clearTimeout(timeoutId)
  }, [recipientInput, resolveENS, clearResults, validateENSName])

  // Handle ENS errors
  useEffect(() => {
    if (ensError) {
      setErrors(prev => ({ 
        ...prev, 
        recipientAddress: ensError 
      }))
    }
  }, [ensError])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate amount
    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0'
    } else if (numAmount > 10000) {
      newErrors.amount = 'Amount cannot exceed $10,000'
    }

    // Validate recipient
    const finalRecipientAddress = resolvedAddress || (recipientInput.startsWith('0x') ? recipientInput : '')
    if (!finalRecipientAddress) {
      newErrors.recipientAddress = 'Please enter a valid recipient address or ENS name'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) {
      return
    }

    if (!validateForm()) {
      return
    }

    const finalRecipientAddress = resolvedAddress || (recipientInput.startsWith('0x') ? recipientInput : '')
    
    const paymentRequest: PaymentRequest = {
      amount: parseFloat(amount),
      currency,
      recipientAddress: finalRecipientAddress,
      recipientENS: resolvedENS || undefined
    }

    onSubmit(paymentRequest)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
          Send Payment
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Amount Input */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-base sm:text-lg">$</span>
              </div>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max="10000"
                className={`
                  block w-full pl-6 sm:pl-8 pr-16 sm:pr-20 py-2.5 sm:py-3 border rounded-xl 
                  text-base sm:text-lg font-medium
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  transition-colors duration-200
                  ${errors.amount ? 'border-error-500 bg-error-50' : 'border-gray-300'}
                `}
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="border-none bg-transparent text-gray-500 font-medium focus:ring-0 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            {errors.amount && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 text-sm text-error-600"
              >
                {errors.amount}
              </motion.p>
            )}
          </div>

          {/* Recipient Input */}
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
              Recipient
            </label>
            <div className="relative">
              <input
                type="text"
                id="recipient"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="ENS name (e.g., alice.eth) or wallet address"
                className={`
                  block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl text-sm sm:text-base
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  transition-colors duration-200
                  ${errors.recipientAddress ? 'border-error-500 bg-error-50' : 'border-gray-300'}
                `}
                disabled={isLoading}
              />
              {isResolvingENS && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                </div>
              )}
            </div>
            
            {/* Show resolved address */}
            {resolvedENS && resolvedAddress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 p-3 bg-success-50 border border-success-200 rounded-lg"
              >
                <p className="text-sm text-success-800">
                  <span className="font-medium">{resolvedENS}</span> resolves to:
                </p>
                <p className="text-xs text-success-600 font-mono break-all mt-1">
                  {resolvedAddress}
                </p>
              </motion.div>
            )}

            {errors.recipientAddress && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 text-sm text-error-600"
              >
                {errors.recipientAddress}
              </motion.p>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !(resolvedAddress || (recipientInput.startsWith('0x') && recipientInput.length === 42)) || !amount}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-white
              text-sm sm:text-base transition-all duration-200
              ${
                isLoading || !(resolvedAddress || (recipientInput.startsWith('0x') && recipientInput.length === 42)) || !amount
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 shadow-medium hover:shadow-strong'
              }
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              'Send Payment'
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  )
}