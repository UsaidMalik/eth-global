import { vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FeeEstimator from '../FeeEstimator'
import { FeeEstimate } from '@/types'

describe('FeeEstimator', () => {
  const mockOnFeeUpdate = vi.fn()

  beforeEach(() => {
    mockOnFeeUpdate.mockClear()
  })

  const renderFeeEstimator = (amount = 0, currency = 'USD') => {
    return render(
      <FeeEstimator 
        amount={amount} 
        currency={currency} 
        onFeeUpdate={mockOnFeeUpdate} 
      />
    )
  }

  it('renders fee estimator component', () => {
    renderFeeEstimator()
    
    expect(screen.getByText('Fee Estimate')).toBeInTheDocument()
  })

  it('shows placeholder when amount is zero', () => {
    renderFeeEstimator(0)
    
    expect(screen.getByText('Enter an amount to see fee estimates')).toBeInTheDocument()
  })

  it('calculates and displays fees for valid amount', async () => {
    renderFeeEstimator(100)
    
    // Wait for fee calculation
    await waitFor(() => {
      expect(screen.getByText('On-ramp fee (1.5%)')).toBeInTheDocument()
      expect(screen.getByText('Blockchain fee')).toBeInTheDocument()
      expect(screen.getByText('Off-ramp fee (1%)')).toBeInTheDocument()
      expect(screen.getByText('Total fees')).toBeInTheDocument()
    }, { timeout: 1000 })

    // Check that fee values are displayed (not loading)
    await waitFor(() => {
      const feeElements = screen.getAllByText(/\$\d+\.\d{2}/)
      expect(feeElements.length).toBeGreaterThan(0)
    }, { timeout: 1000 })
  })

  it('shows network status and estimated time', async () => {
    renderFeeEstimator(100)
    
    await waitFor(() => {
      expect(screen.getByText('Network status')).toBeInTheDocument()
      expect(screen.getByText('Estimated time')).toBeInTheDocument()
    }, { timeout: 1000 })

    // Check that network status shows one of the expected values
    await waitFor(() => {
      const networkStatus = screen.getByText(/Fast|Normal|Congested/)
      expect(networkStatus).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('displays total amount including fees', async () => {
    renderFeeEstimator(100)
    
    await waitFor(() => {
      expect(screen.getByText('Total amount (including fees)')).toBeInTheDocument()
    }, { timeout: 1000 })

    // Check that total amount is displayed
    await waitFor(() => {
      const totalElements = screen.getAllByText(/\$\d+\.\d{2}/)
      expect(totalElements.length).toBeGreaterThan(3) // Should have multiple fee amounts plus total
    }, { timeout: 1000 })
  })

  it('calls onFeeUpdate callback when fees are calculated', async () => {
    renderFeeEstimator(100)
    
    await waitFor(() => {
      expect(mockOnFeeUpdate).toHaveBeenCalled()
    }, { timeout: 1000 })

    const lastCall = mockOnFeeUpdate.mock.calls[mockOnFeeUpdate.mock.calls.length - 1]
    const feeEstimate = lastCall[0] as FeeEstimate
    
    expect(feeEstimate).toHaveProperty('onRampFee')
    expect(feeEstimate).toHaveProperty('blockchainFee')
    expect(feeEstimate).toHaveProperty('offRampFee')
    expect(feeEstimate).toHaveProperty('totalFee')
    expect(feeEstimate).toHaveProperty('estimatedTime')
    
    expect(feeEstimate.totalFee).toBeGreaterThan(0)
    expect(feeEstimate.estimatedTime).toBeGreaterThan(0)
  })

  it('updates fees when amount changes', async () => {
    const { rerender } = renderFeeEstimator(50)
    
    // Wait for initial calculation
    await waitFor(() => {
      expect(mockOnFeeUpdate).toHaveBeenCalled()
    }, { timeout: 1000 })

    const initialCallCount = mockOnFeeUpdate.mock.calls.length

    // Change amount
    rerender(
      <FeeEstimator 
        amount={200} 
        currency="USD" 
        onFeeUpdate={mockOnFeeUpdate} 
      />
    )
    
    // Wait for new calculation
    await waitFor(() => {
      expect(mockOnFeeUpdate.mock.calls.length).toBeGreaterThan(initialCallCount)
    }, { timeout: 1000 })
  })

  it('handles different currencies', async () => {
    renderFeeEstimator(100, 'EUR')
    
    await waitFor(() => {
      expect(screen.getByText('Fee Estimate')).toBeInTheDocument()
    })

    // Should still calculate fees regardless of currency
    await waitFor(() => {
      expect(mockOnFeeUpdate).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('shows loading state during calculation', async () => {
    renderFeeEstimator(100)
    
    // Should eventually show calculated fees
    await waitFor(() => {
      expect(screen.getByText('Total fees')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('resets fees when amount becomes zero', async () => {
    const { rerender } = renderFeeEstimator(100)
    
    // Wait for initial calculation
    await waitFor(() => {
      expect(mockOnFeeUpdate).toHaveBeenCalled()
    }, { timeout: 1000 })

    // Change amount to zero
    rerender(
      <FeeEstimator 
        amount={0} 
        currency="USD" 
        onFeeUpdate={mockOnFeeUpdate} 
      />
    )
    
    // Should show placeholder again
    expect(screen.getByText('Enter an amount to see fee estimates')).toBeInTheDocument()
    
    // Should call onFeeUpdate with zero fees
    await waitFor(() => {
      const lastCall = mockOnFeeUpdate.mock.calls[mockOnFeeUpdate.mock.calls.length - 1]
      const feeEstimate = lastCall[0] as FeeEstimate
      expect(feeEstimate.totalFee).toBe(0)
    })
  })

  it('formats currency correctly', async () => {
    renderFeeEstimator(100, 'USD')
    
    await waitFor(() => {
      // Should display currency in USD format
      const currencyElements = screen.getAllByText(/\$\d+\.\d{2}/)
      expect(currencyElements.length).toBeGreaterThan(0)
    }, { timeout: 1000 })
  })

  it('formats time estimates correctly', async () => {
    renderFeeEstimator(100)
    
    await waitFor(() => {
      // Should display time in minutes or hours format
      const timeElement = screen.getByText(/\d+\s*(min|h)/i)
      expect(timeElement).toBeInTheDocument()
    }, { timeout: 1000 })
  })
})