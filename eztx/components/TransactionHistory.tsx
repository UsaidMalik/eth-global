'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Transaction, TransactionStatus } from '@/types'

interface TransactionHistoryProps {
  transactions: Transaction[]
  onTransactionSelect?: (transaction: Transaction) => void
}

interface SortOption {
  key: keyof Transaction
  label: string
  direction: 'asc' | 'desc'
}

interface FilterOption {
  status: TransactionStatus | 'all'
  label: string
}

export default function TransactionHistory({ transactions, onTransactionSelect }: TransactionHistoryProps) {
  const [sortBy, setSortBy] = useState<SortOption>({
    key: 'timestamp',
    label: 'Date',
    direction: 'desc'
  })
  const [filterBy, setFilterBy] = useState<FilterOption>({
    status: 'all',
    label: 'All Transactions'
  })
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const filterOptions: FilterOption[] = [
    { status: 'all', label: 'All Transactions' },
    { status: TransactionStatus.COMPLETED, label: 'Completed' },
    { status: TransactionStatus.PENDING, label: 'Pending' },
    { status: TransactionStatus.FAILED, label: 'Failed' },
    { status: TransactionStatus.ON_RAMPING, label: 'Processing' },
  ]

  const sortOptions: SortOption[] = [
    { key: 'timestamp', label: 'Date', direction: 'desc' },
    { key: 'amount', label: 'Amount', direction: 'desc' },
    { key: 'status', label: 'Status', direction: 'asc' },
  ]

  // Filter and sort transactions
  const filteredAndSortedTransactions = transactions
    .filter(tx => filterBy.status === 'all' || tx.status === filterBy.status)
    .sort((a, b) => {
      const aValue = a[sortBy.key]
      const bValue = b[sortBy.key]
      
      if (sortBy.key === 'timestamp') {
        const aTime = new Date(aValue as Date).getTime()
        const bTime = new Date(bValue as Date).getTime()
        return sortBy.direction === 'desc' ? bTime - aTime : aTime - bTime
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortBy.direction === 'desc' ? bValue - aValue : aValue - bValue
      }
      
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      return sortBy.direction === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr)
    })

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return 'text-success-600 bg-success-50 border-success-200'
      case TransactionStatus.FAILED:
        return 'text-error-600 bg-error-50 border-error-200'
      case TransactionStatus.PENDING:
      case TransactionStatus.ON_RAMPING:
      case TransactionStatus.CONVERTING:
      case TransactionStatus.TRANSFERRING:
      case TransactionStatus.OFF_RAMPING:
        return 'text-warning-600 bg-warning-50 border-warning-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case TransactionStatus.FAILED:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case TransactionStatus.PENDING:
      case TransactionStatus.ON_RAMPING:
      case TransactionStatus.CONVERTING:
      case TransactionStatus.TRANSFERRING:
      case TransactionStatus.OFF_RAMPING:
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      default:
        return null
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const formatStatus = (status: TransactionStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    onTransactionSelect?.(transaction)
  }

  const getProgressSteps = (status: TransactionStatus) => {
    const steps = [
      { key: TransactionStatus.INITIATED, label: 'Initiated' },
      { key: TransactionStatus.ON_RAMPING, label: 'On-ramping' },
      { key: TransactionStatus.CONVERTING, label: 'Converting' },
      { key: TransactionStatus.TRANSFERRING, label: 'Transferring' },
      { key: TransactionStatus.OFF_RAMPING, label: 'Off-ramping' },
      { key: TransactionStatus.COMPLETED, label: 'Completed' }
    ]

    const currentIndex = steps.findIndex(step => step.key === status)
    const isCompleted = status === TransactionStatus.COMPLETED
    const isFailed = status === TransactionStatus.FAILED

    return steps.map((step, index) => ({
      ...step,
      isActive: index === currentIndex,
      isCompleted: isCompleted || index < currentIndex,
      isFailed: isFailed && index === currentIndex
    }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Transaction History</h2>
            
            {/* Controls */}
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
              {/* Filter */}
              <select
                value={filterBy.status}
                onChange={(e) => {
                  const option = filterOptions.find(opt => opt.status === e.target.value)
                  if (option) setFilterBy(option)
                }}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {filterOptions.map(option => (
                  <option key={option.status} value={option.status}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={`${sortBy.key}-${sortBy.direction}`}
                onChange={(e) => {
                  const [key, direction] = e.target.value.split('-')
                  const option = sortOptions.find(opt => opt.key === key)
                  if (option) {
                    setSortBy({ ...option, direction: direction as 'asc' | 'desc' })
                  }
                }}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {sortOptions.map(option => (
                  <option key={`${option.key}-${option.direction}`} value={`${option.key}-${option.direction}`}>
                    {option.label} ({option.direction === 'desc' ? 'Newest' : 'Oldest'} first)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="divide-y divide-gray-100">
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-500">
                {filterBy.status === 'all' 
                  ? 'You haven\'t made any payments yet.' 
                  : `No ${filterBy.label.toLowerCase()} found.`}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredAndSortedTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 sm:p-6 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  onClick={() => handleTransactionClick(transaction)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      {/* Status Icon */}
                      <div className={`p-1.5 sm:p-2 rounded-full border ${getStatusColor(transaction.status)}`}>
                        {getStatusIcon(transaction.status)}
                      </div>

                      {/* Transaction Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col xs:flex-row xs:items-center xs:space-x-2 space-y-1 xs:space-y-0">
                          <span className="font-semibold text-gray-900 text-sm sm:text-base">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </span>
                          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)} self-start xs:self-auto`}>
                            {formatStatus(transaction.status)}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                          To: {transaction.recipient.length > (window.innerWidth < 640 ? 15 : 20)
                            ? `${transaction.recipient.slice(0, window.innerWidth < 640 ? 8 : 10)}...${transaction.recipient.slice(-6)}`
                            : transaction.recipient}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(transaction.timestamp)}
                        </div>
                      </div>
                    </div>

                    {/* Amount and Arrow */}
                    <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
                      <div className="text-right hidden xs:block">
                        <div className="font-semibold text-gray-900 text-sm">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Fee: {formatCurrency(transaction.fees.totalFee, transaction.currency)}
                        </div>
                      </div>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedTransaction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-strong max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Progress Steps */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Progress</h4>
                  <div className="space-y-3">
                    {getProgressSteps(selectedTransaction.status).map((step, index) => (
                      <div key={step.key} className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          step.isFailed 
                            ? 'bg-error-500 text-white'
                            : step.isCompleted 
                              ? 'bg-success-500 text-white' 
                              : step.isActive 
                                ? 'bg-warning-500 text-white' 
                                : 'bg-gray-200 text-gray-600'
                        }`}>
                          {step.isCompleted && !step.isFailed ? '✓' : index + 1}
                        </div>
                        <span className={`text-sm ${
                          step.isActive ? 'font-medium text-gray-900' : 'text-gray-600'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transaction Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                      <p className={`text-sm font-medium ${getStatusColor(selectedTransaction.status).split(' ')[0]}`}>
                        {formatStatus(selectedTransaction.status)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recipient</label>
                    <p className="text-sm font-mono text-gray-900 break-all">
                      {selectedTransaction.recipient}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transaction ID</label>
                    <p className="text-sm font-mono text-gray-900 break-all">
                      {selectedTransaction.id}
                    </p>
                  </div>

                  {selectedTransaction.txHash && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Blockchain Hash</label>
                      <p className="text-sm font-mono text-gray-900 break-all">
                        {selectedTransaction.txHash}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Timestamp</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedTransaction.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {/* Fee Breakdown */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Fee Breakdown</label>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>On-ramp fee</span>
                        <span>{formatCurrency(selectedTransaction.fees.onRampFee, selectedTransaction.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Blockchain fee</span>
                        <span>{formatCurrency(selectedTransaction.fees.blockchainFee, selectedTransaction.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Off-ramp fee</span>
                        <span>{formatCurrency(selectedTransaction.fees.offRampFee, selectedTransaction.currency)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between font-medium">
                        <span>Total fees</span>
                        <span>{formatCurrency(selectedTransaction.fees.totalFee, selectedTransaction.currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}