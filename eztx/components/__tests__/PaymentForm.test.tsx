import { vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PaymentForm from '../PaymentForm'
import { PaymentRequest } from '@/types'

describe('PaymentForm', () => {
  const mockOnSubmit = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  const renderPaymentForm = (isLoading = false) => {
    return render(
      <PaymentForm onSubmit={mockOnSubmit} isLoading={isLoading} />
    )
  }

  it('renders payment form with all required fields', () => {
    renderPaymentForm()
    
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send payment/i })).toBeInTheDocument()
  })

  it('validates amount input correctly', async () => {
    renderPaymentForm()
    
    const amountInput = screen.getByLabelText(/amount/i)
    const submitButton = screen.getByRole('button', { name: /send payment/i })
    
    // Test empty amount
    await user.click(submitButton)
    expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument()
    
    // Test negative amount
    await user.type(amountInput, '-10')
    await user.click(submitButton)
    expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument()
    
    // Test amount too large
    await user.clear(amountInput)
    await user.type(amountInput, '15000')
    await user.click(submitButton)
    expect(screen.getByText(/amount cannot exceed/i)).toBeInTheDocument()
  })

  it('validates recipient address correctly', async () => {
    renderPaymentForm()
    
    const recipientInput = screen.getByLabelText(/recipient/i)
    const submitButton = screen.getByRole('button', { name: /send payment/i })
    
    // Test empty recipient
    await user.click(submitButton)
    expect(screen.getByText(/please enter a valid recipient/i)).toBeInTheDocument()
    
    // Test invalid address format
    await user.type(recipientInput, 'invalid-address')
    await user.click(submitButton)
    expect(screen.getByText(/please enter a valid ens name or wallet address/i)).toBeInTheDocument()
  })

  it('handles valid Ethereum address input', async () => {
    renderPaymentForm()
    
    const recipientInput = screen.getByLabelText(/recipient/i)
    const validAddress = '0x742d35Cc6634C0532925a3b8D400E4C0C0C8c0C8'
    
    await user.type(recipientInput, validAddress)
    
    // Wait for validation
    await waitFor(() => {
      expect(screen.queryByText(/invalid wallet address/i)).not.toBeInTheDocument()
    })
  })

  it('simulates ENS resolution for .eth addresses', async () => {
    renderPaymentForm()
    
    const recipientInput = screen.getByLabelText(/recipient/i)
    
    await user.type(recipientInput, 'alice.eth')
    
    // Wait for ENS resolution
    await waitFor(() => {
      expect(screen.getByText('alice.eth')).toBeInTheDocument()
      expect(screen.getByText('resolves to:')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('submits form with valid data', async () => {
    renderPaymentForm()
    
    const amountInput = screen.getByLabelText(/amount/i)
    const recipientInput = screen.getByLabelText(/recipient/i)
    const submitButton = screen.getByRole('button', { name: /send payment/i })
    
    await user.type(amountInput, '100')
    await user.type(recipientInput, '0x742d35Cc6634C0532925a3b8D400E4C0C0C8c0C8')
    
    // Wait for validation to complete
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    await user.click(submitButton)
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      amount: 100,
      currency: 'USD',
      recipientAddress: '0x742d35Cc6634C0532925a3b8D400E4C0C0C8c0C8',
      recipientENS: undefined
    })
  })

  it('submits form with ENS name', async () => {
    renderPaymentForm()
    
    const amountInput = screen.getByLabelText(/amount/i)
    const recipientInput = screen.getByLabelText(/recipient/i)
    const submitButton = screen.getByRole('button', { name: /send payment/i })
    
    await user.type(amountInput, '50')
    await user.type(recipientInput, 'alice.eth')
    
    // Wait for ENS resolution
    await waitFor(() => {
      expect(screen.getByText('alice.eth')).toBeInTheDocument()
      expect(screen.getByText('resolves to:')).toBeInTheDocument()
    }, { timeout: 1000 })
    
    await user.click(submitButton)
    
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50,
        currency: 'USD',
        recipientENS: 'alice.eth',
        recipientAddress: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/)
      })
    )
  })

  it('disables form when loading', () => {
    renderPaymentForm(true)
    
    const amountInput = screen.getByLabelText(/amount/i)
    const recipientInput = screen.getByLabelText(/recipient/i)
    const submitButton = screen.getByRole('button', { name: /processing/i })
    
    expect(amountInput).toBeDisabled()
    expect(recipientInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('changes currency selection', async () => {
    renderPaymentForm()
    
    const currencySelect = screen.getByDisplayValue('USD')
    
    await user.selectOptions(currencySelect, 'EUR')
    
    expect(screen.getByDisplayValue('EUR')).toBeInTheDocument()
  })

  it('prevents submission with invalid form data', async () => {
    renderPaymentForm()
    
    const submitButton = screen.getByRole('button', { name: /send payment/i })
    
    // Try to submit empty form
    await user.click(submitButton)
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
    
    // Check that validation errors appear after form submission
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid recipient/i)).toBeInTheDocument()
    })
  })
})