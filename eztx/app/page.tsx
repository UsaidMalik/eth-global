'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import PaymentForm from '@/components/PaymentForm'
import FeeEstimator from '@/components/FeeEstimator'
import TransactionHistory from '@/components/TransactionHistory'
import ProgressIndicator, { CircularProgress } from '@/components/animations/ProgressIndicator'
import { AnimatedButton, AnimatedCard, Toast } from '@/components/animations/MicroInteractions'
import PageTransition from '@/components/animations/PageTransition'
import ResponsiveLayout, { useScreenSize, ResponsiveNav, ResponsiveGrid } from '@/components/responsive/ResponsiveLayout'
import TouchFriendly from '@/components/responsive/TouchFriendly'
import { PaymentRequest, Transaction, TransactionStatus, FeeEstimate } from '@/types'
import { staggerContainer, staggerItem } from '@/utils/animations'

export default function Home() {
  const [currentView, setCurrentView] = useState<'payment' | 'history'>('payment')
  const { isMobile, isTablet } = useScreenSize()
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentCurrency, setPaymentCurrency] = useState('USD')
  const [currentFees, setCurrentFees] = useState<FeeEstimate>({
    onRampFee: 0,
    blockchainFee: 0,
    offRampFee: 0,
    totalFee: 0,
    estimatedTime: 0
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    isVisible: boolean
  }>({
    message: '',
    type: 'info',
    isVisible: false
  })

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }

  const handlePaymentSubmit = async (payment: PaymentRequest) => {
    setIsProcessing(true)
    setPaymentAmount(payment.amount)
    setPaymentCurrency(payment.currency)

    // Create new transaction
    const newTransaction: Transaction = {
      id: `tx_${Date.now()}`,
      timestamp: new Date(),
      amount: payment.amount,
      currency: payment.currency,
      recipient: payment.recipientAddress,
      status: TransactionStatus.PENDING,
      fees: currentFees,
      txHash: undefined
    }

    setCurrentTransaction(newTransaction)
    setTransactions(prev => [newTransaction, ...prev])

    // Simulate payment processing stages
    const stages = [
      { status: TransactionStatus.ON_RAMPING, delay: 2000, message: 'Converting fiat to PYUSD...' },
      { status: TransactionStatus.CONVERTING, delay: 1500, message: 'Processing conversion...' },
      { status: TransactionStatus.TRANSFERRING, delay: 3000, message: 'Transferring on blockchain...' },
      { status: TransactionStatus.OFF_RAMPING, delay: 2000, message: 'Converting to recipient currency...' },
      { status: TransactionStatus.COMPLETED, delay: 1000, message: 'Payment completed successfully!' }
    ]

    try {
      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, stage.delay))
        
        const updatedTransaction = { ...newTransaction, status: stage.status }
        if (stage.status === TransactionStatus.TRANSFERRING) {
          updatedTransaction.txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
        }
        
        setCurrentTransaction(updatedTransaction)
        setTransactions(prev => prev.map(tx => 
          tx.id === newTransaction.id ? updatedTransaction : tx
        ))
        
        showToast(stage.message, stage.status === TransactionStatus.COMPLETED ? 'success' : 'info')
      }
    } catch (error) {
      const failedTransaction = { ...newTransaction, status: TransactionStatus.FAILED }
      setCurrentTransaction(failedTransaction)
      setTransactions(prev => prev.map(tx => 
        tx.id === newTransaction.id ? failedTransaction : tx
      ))
      showToast('Payment failed. Please try again.', 'error')
    } finally {
      setIsProcessing(false)
      setTimeout(() => setCurrentTransaction(null), 3000)
    }
  }

  const handleFeeUpdate = (fees: FeeEstimate) => {
    setCurrentFees(fees)
  }

  const navItems = [
    { 
      label: 'Send Payment', 
      value: 'payment',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )
    },
    { 
      label: 'History', 
      value: 'history',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  return (
    <PageTransition className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <ResponsiveLayout className={isMobile ? 'pb-20' : ''}>
        {/* Header */}
        <motion.header
          className={`text-center ${isMobile ? 'mb-6' : 'mb-8 lg:mb-12'}`}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.h1
            className={`${isMobile ? 'text-2xl' : 'text-4xl md:text-6xl'} font-bold text-gray-900 mb-2 sm:mb-4`}
            variants={staggerItem}
          >
            <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              EZ Transfer
            </span>
          </motion.h1>
          <motion.p
            className={`${isMobile ? 'text-base' : 'text-xl'} text-gray-600 max-w-2xl mx-auto px-4`}
            variants={staggerItem}
          >
            Send money globally in seconds with blockchain technology
          </motion.p>
        </motion.header>

        {/* Navigation */}
        {!isMobile && (
          <motion.nav
            className="flex justify-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ResponsiveNav
              items={navItems}
              activeItem={currentView}
              onItemChange={(value) => setCurrentView(value as 'payment' | 'history')}
              className="bg-white rounded-2xl shadow-soft"
            />
          </motion.nav>
        )}

        {/* Main Content */}
        <motion.main
          layout
          transition={{ duration: 0.3 }}
        >
          {currentView === 'payment' ? (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: isMobile ? 0 : -20, y: isMobile ? 20 : 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: isMobile ? 0 : 20, y: isMobile ? -20 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ResponsiveGrid
                cols={{ mobile: 1, tablet: 1, desktop: 2 }}
                gap={{ mobile: 'gap-4', tablet: 'gap-6', desktop: 'gap-8' }}
              >
                {/* Payment Form */}
                <div className="space-y-4 sm:space-y-6">
                  <TouchFriendly>
                    <AnimatedCard delay={0.1}>
                      <PaymentForm
                        onSubmit={handlePaymentSubmit}
                        isLoading={isProcessing}
                      />
                    </AnimatedCard>
                  </TouchFriendly>

                  {/* Fee Estimator */}
                  <TouchFriendly>
                    <AnimatedCard delay={0.2}>
                      <FeeEstimator
                        amount={paymentAmount}
                        currency={paymentCurrency}
                        onFeeUpdate={handleFeeUpdate}
                      />
                    </AnimatedCard>
                  </TouchFriendly>
                </div>

                {/* Progress Indicator */}
                <div className="space-y-4 sm:space-y-6">
                  {currentTransaction && (
                    <TouchFriendly>
                      <AnimatedCard delay={0.3}>
                        <div className="p-4 sm:p-6">
                          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-4 sm:mb-6`}>
                            Payment Progress
                          </h3>
                          
                          <div className="space-y-4 sm:space-y-6">
                            <ProgressIndicator
                              status={currentTransaction.status}
                              size={isMobile ? "sm" : "md"}
                            />
                            
                            <div className="flex justify-center">
                              <CircularProgress
                                status={currentTransaction.status}
                                size={isMobile ? 100 : 120}
                              />
                            </div>
                            
                            <div className="text-center">
                              <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900`}>
                                {currentTransaction.amount.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: currentTransaction.currency
                                })}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 break-all">
                                To: {isMobile 
                                  ? `${currentTransaction.recipient.slice(0, 8)}...${currentTransaction.recipient.slice(-6)}`
                                  : `${currentTransaction.recipient.slice(0, 10)}...${currentTransaction.recipient.slice(-8)}`
                                }
                              </p>
                              {currentTransaction.txHash && (
                                <p className="text-xs text-gray-500 mt-2 font-mono break-all">
                                  TX: {isMobile 
                                    ? `${currentTransaction.txHash.slice(0, 8)}...${currentTransaction.txHash.slice(-6)}`
                                    : `${currentTransaction.txHash.slice(0, 10)}...${currentTransaction.txHash.slice(-8)}`
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </AnimatedCard>
                    </TouchFriendly>
                  )}

                  {/* Demo Animation Showcase */}
                  {!currentTransaction && (
                    <TouchFriendly>
                      <AnimatedCard delay={0.3}>
                        <div className="p-4 sm:p-6">
                          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-4 sm:mb-6`}>
                            Animation Showcase
                          </h3>
                          
                          <div className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                              <AnimatedButton
                                variant="primary"
                                size={isMobile ? "sm" : "md"}
                                onClick={() => showToast('Success message!', 'success')}
                              >
                                Success Toast
                              </AnimatedButton>
                              <AnimatedButton
                                variant="error"
                                size={isMobile ? "sm" : "md"}
                                onClick={() => showToast('Error message!', 'error')}
                              >
                                Error Toast
                              </AnimatedButton>
                            </div>
                            
                            <ProgressIndicator
                              status={TransactionStatus.TRANSFERRING}
                              size="sm"
                              showLabels={!isMobile}
                            />
                            
                            <div className="text-center text-xs sm:text-sm text-gray-600">
                              Interactive animation components
                            </div>
                          </div>
                        </div>
                      </AnimatedCard>
                    </TouchFriendly>
                  )}
                </div>
              </ResponsiveGrid>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: isMobile ? 0 : 20, y: isMobile ? 20 : 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: isMobile ? 0 : -20, y: isMobile ? -20 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <TouchFriendly>
                <TransactionHistory
                  transactions={transactions}
                  onTransactionSelect={(tx) => console.log('Selected transaction:', tx)}
                />
              </TouchFriendly>
            </motion.div>
          )}
        </motion.main>

        {/* Mobile Navigation */}
        {isMobile && (
          <ResponsiveNav
            items={navItems}
            activeItem={currentView}
            onItemChange={(value) => setCurrentView(value as 'payment' | 'history')}
          />
        )}

        {/* Toast Notifications */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      </ResponsiveLayout>
    </PageTransition>
  )
}
