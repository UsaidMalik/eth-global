import { vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionHistory from '../TransactionHistory'
import { Transaction, TransactionStatus } from '@/types'

describe('TransactionHistory', () => {
  const mockOnTransactionSelect = vi.fn()
  const user = userEvent.setup()

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      amount: 100,
      currency: 'USD',
      recipient: '0x742d35Cc6634C0532925a3b8D400E4C0C0C8c0C8',
      status: TransactionStatus.COMPLETED,
      fees: {
        onRampFee: 1.5,
        blockchainFee: 2.5,
        offRampFee: 1.0,
        totalFee: 5.0,
        estimatedTime: 5
      },
      txHash: '0xabc123def456'
    },
    {
      id: 'tx-2',
      timestamp: new Date('2024-01-14T15:45:00Z'),
      amount: 250,
      currency: 'USD',
      recipient: 'alice.eth',
      status: TransactionStatus.ON_RAMPING,
      fees: {
        onRampFee: 3.75,
        blockchainFee: 3.0,
        offRampFee: 2.5,
        totalFee: 9.25,
        estimatedTime: 8
      }
    },
    {
      id: 'tx-3',
      timestamp: new Date('2024-01-13T09:15:00Z'),
      amount: 50,
      currency: 'USD',
      recipient: '0x123abc456def789ghi012jkl345mno678pqr901st',
      status: TransactionStatus.FAILED,
      fees: {
        onRampFee: 0.75,
        blockchainFee: 2.0,
        offRampFee: 0.5,
        totalFee: 3.25,
        estimatedTime: 3
      }
    }
  ]

  beforeEach(() => {
    mockOnTransactionSelect.mockClear()
  })

  const renderTransactionHistory = (transactions = mockTransactions) => {
    return render(
      <TransactionHistory 
        transactions={transactions} 
        onTransactionSelect={mockOnTransactionSelect} 
      />
    )
  }

  it('renders transaction history component', () => {
    renderTransactionHistory()
    
    expect(screen.getByText('Transaction History')).toBeInTheDocument()
  })

  it('displays all transactions by default', () => {
    renderTransactionHistory()
    
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
  })

  it('shows empty state when no transactions', () => {
    renderTransactionHistory([])
    
    expect(screen.getByText('No transactions found')).toBeInTheDocument()
    expect(screen.getByText('You haven\'t made any payments yet.')).toBeInTheDocument()
  })

  it('filters transactions by status', async () => {
    renderTransactionHistory()
    
    const filterSelect = screen.getByDisplayValue('All Transactions')
    
    await user.selectOptions(filterSelect, 'Completed')
    
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.queryByText('$250.00')).not.toBeInTheDocument()
    expect(screen.queryByText('$50.00')).not.toBeInTheDocument()
  })

  it('sorts transactions by different criteria', async () => {
    renderTransactionHistory()
    
    const sortSelect = screen.getByDisplayValue('Date (Newest first)')
    
    await user.selectOptions(sortSelect, 'amount-desc')
    
    // Should still show all transactions but in different order
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
  })

  it('displays transaction status with appropriate styling', () => {
    renderTransactionHistory()
    
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('On Ramping')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('truncates long recipient addresses', () => {
    renderTransactionHistory()
    
    // Should show truncated version of long address
    expect(screen.getByText(/0x123abc456d\.\.\.pqr901st/)).toBeInTheDocument()
  })

  it('shows ENS names without truncation', () => {
    renderTransactionHistory()
    
    expect(screen.getByText('alice.eth')).toBeInTheDocument()
  })

  it('opens transaction detail modal when clicked', async () => {
    renderTransactionHistory()
    
    const firstTransaction = screen.getAllByText('$100.00')[0].closest('div')
    if (firstTransaction) {
      await user.click(firstTransaction)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument()
    })
    
    expect(mockOnTransactionSelect).toHaveBeenCalledWith(mockTransactions[0])
  })

  it('displays transaction details in modal', async () => {
    renderTransactionHistory()
    
    const firstTransaction = screen.getAllByText('$100.00')[0].closest('div')
    if (firstTransaction) {
      await user.click(firstTransaction)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument()
      expect(screen.getByText('tx-1')).toBeInTheDocument()
      expect(screen.getByText('0xabc123def456')).toBeInTheDocument()
    })
  })

  it('shows progress steps in transaction detail', async () => {
    renderTransactionHistory()
    
    const firstTransaction = screen.getAllByText('$100.00')[0].closest('div')
    if (firstTransaction) {
      await user.click(firstTransaction)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('Initiated')).toBeInTheDocument()
      expect(screen.getByText('On-ramping')).toBeInTheDocument()
      expect(screen.getByText('Converting')).toBeInTheDocument()
      expect(screen.getByText('Transferring')).toBeInTheDocument()
      expect(screen.getByText('Off-ramping')).toBeInTheDocument()
    })
  })

  it('displays fee breakdown in transaction detail', async () => {
    renderTransactionHistory()
    
    const firstTransaction = screen.getAllByText('$100.00')[0].closest('div')
    if (firstTransaction) {
      await user.click(firstTransaction)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Fee Breakdown')).toBeInTheDocument()
      expect(screen.getByText('On-ramp fee')).toBeInTheDocument()
      expect(screen.getByText('Blockchain fee')).toBeInTheDocument()
      expect(screen.getByText('Off-ramp fee')).toBeInTheDocument()
      expect(screen.getByText('Total fees')).toBeInTheDocument()
    })
  })

  it('closes modal when clicking close button', async () => {
    renderTransactionHistory()
    
    const firstTransaction = screen.getAllByText('$100.00')[0].closest('div')
    if (firstTransaction) {
      await user.click(firstTransaction)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument()
    })
    
    const closeButton = screen.getByRole('button') // Close button with X icon
    await user.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Transaction Details')).not.toBeInTheDocument()
    })
  })

  it('closes modal when clicking backdrop', async () => {
    renderTransactionHistory()
    
    const firstTransaction = screen.getAllByText('$100.00')[0].closest('div')
    if (firstTransaction) {
      await user.click(firstTransaction)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument()
    })
    
    // Click on the backdrop (modal overlay)
    const backdrop = screen.getByText('Transaction Details').closest('div').parentElement
    if (backdrop) {
      fireEvent.click(backdrop)
    }
    
    await waitFor(() => {
      expect(screen.queryByText('Transaction Details')).not.toBeInTheDocument()
    })
  })

  it('formats currency correctly', () => {
    renderTransactionHistory()
    
    expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$250.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$50.00').length).toBeGreaterThan(0)
  })

  it('formats dates correctly', () => {
    renderTransactionHistory()
    
    // Should show formatted dates (exact format may vary by locale)
    expect(screen.getByText(/Jan 15/)).toBeInTheDocument()
    expect(screen.getByText(/Jan 14/)).toBeInTheDocument()
    expect(screen.getByText(/Jan 13/)).toBeInTheDocument()
  })

  it('shows appropriate icons for different statuses', () => {
    renderTransactionHistory()
    
    // Check that SVG elements are present for status icons
    const svgElements = document.querySelectorAll('svg')
    expect(svgElements.length).toBeGreaterThan(0)
  })

  it('handles empty filter results', async () => {
    renderTransactionHistory()
    
    const filterSelect = screen.getByDisplayValue('All Transactions')
    
    // Filter by pending status (which doesn't exist in our mock data)
    await user.selectOptions(filterSelect, 'pending')
    
    expect(screen.getByText('No transactions found')).toBeInTheDocument()
    expect(screen.getByText(/No.*found/)).toBeInTheDocument()
  })

  it('displays transaction fees in list view', () => {
    renderTransactionHistory()
    
    expect(screen.getByText('Fee: $5.00')).toBeInTheDocument()
    expect(screen.getByText('Fee: $9.25')).toBeInTheDocument()
    expect(screen.getByText('Fee: $3.25')).toBeInTheDocument()
  })
})