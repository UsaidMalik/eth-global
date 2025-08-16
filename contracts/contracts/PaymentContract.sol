// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PaymentContract
 * @dev Smart contract for secure PYUSD transfers with payment tracking
 * @notice This contract handles international payments using PYUSD stable coin
 */
contract PaymentContract is ReentrancyGuard, Ownable, Pausable {
    // PYUSD token interface
    IERC20 public immutable pyusdToken;
    
    // Payment status enumeration
    enum PaymentStatus {
        INITIATED,
        PROCESSING,
        COMPLETED,
        FAILED,
        REFUNDED
    }
    
    // Payment structure
    struct Payment {
        bytes32 id;
        address sender;
        address recipient;
        uint256 amount;
        PaymentStatus status;
        uint256 timestamp;
        uint256 completedAt;
        string metadata; // Optional metadata for payment tracking
    }
    
    // State variables
    mapping(bytes32 => Payment) public payments;
    mapping(address => bytes32[]) public userPayments;
    uint256 public totalPayments;
    uint256 public totalVolume;
    
    // Fee configuration
    uint256 public platformFeeRate = 25; // 0.25% (25 basis points)
    uint256 public constant MAX_FEE_RATE = 1000; // 10% maximum fee
    address public feeRecipient;
    
    // Events
    event PaymentInitiated(
        bytes32 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        uint256 completedAt
    );
    
    event PaymentFailed(
        bytes32 indexed paymentId,
        string reason
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        uint256 refundAmount
    );
    
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    
    // Errors
    error InvalidPaymentId();
    error InvalidAmount();
    error InvalidRecipient();
    error PaymentNotFound();
    error PaymentAlreadyProcessed();
    error InsufficientBalance();
    error TransferFailed();
    error InvalidFeeRate();
    error UnauthorizedAccess();
    
    /**
     * @dev Constructor
     * @param _pyusdToken Address of the PYUSD token contract
     * @param _feeRecipient Address to receive platform fees
     */
    constructor(
        address _pyusdToken,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_pyusdToken != address(0), "Invalid PYUSD token address");
        require(_feeRecipient != address(0), "Invalid fee recipient address");
        
        pyusdToken = IERC20(_pyusdToken);
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Initiate a new payment
     * @param recipient Address of the payment recipient
     * @param amount Amount of PYUSD to transfer
     * @param metadata Optional metadata for payment tracking
     * @return paymentId Unique identifier for the payment
     */
    function initiatePayment(
        address recipient,
        uint256 amount,
        string calldata metadata
    ) external nonReentrant whenNotPaused returns (bytes32 paymentId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (recipient == msg.sender) revert InvalidRecipient();
        
        // Generate unique payment ID
        paymentId = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                amount,
                block.timestamp,
                totalPayments
            )
        );
        
        // Check if payment ID already exists (should be extremely rare)
        if (payments[paymentId].sender != address(0)) {
            revert PaymentAlreadyProcessed();
        }
        
        // Calculate fees
        uint256 platformFee = (amount * platformFeeRate) / 10000;
        uint256 transferAmount = amount - platformFee;
        
        // Check sender balance
        if (pyusdToken.balanceOf(msg.sender) < amount) {
            revert InsufficientBalance();
        }
        
        // Check allowance
        if (pyusdToken.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientBalance();
        }
        
        // Create payment record
        payments[paymentId] = Payment({
            id: paymentId,
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            status: PaymentStatus.INITIATED,
            timestamp: block.timestamp,
            completedAt: 0,
            metadata: metadata
        });
        
        // Add to user's payment history
        userPayments[msg.sender].push(paymentId);
        userPayments[recipient].push(paymentId);
        
        // Transfer tokens from sender to contract
        bool success = pyusdToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        // Update payment status to processing
        payments[paymentId].status = PaymentStatus.PROCESSING;
        
        // Update counters
        totalPayments++;
        totalVolume += amount;
        
        emit PaymentInitiated(paymentId, msg.sender, recipient, amount, block.timestamp);
        
        // Execute the transfer immediately (atomic operation)
        _completePayment(paymentId, transferAmount, platformFee);
        
        return paymentId;
    }
    
    /**
     * @dev Complete a payment (internal function)
     * @param paymentId The payment identifier
     * @param transferAmount Amount to transfer to recipient
     * @param platformFee Fee amount to transfer to platform
     */
    function _completePayment(
        bytes32 paymentId,
        uint256 transferAmount,
        uint256 platformFee
    ) internal {
        Payment storage payment = payments[paymentId];
        
        // Transfer to recipient
        bool recipientTransfer = pyusdToken.transfer(payment.recipient, transferAmount);
        if (!recipientTransfer) {
            payment.status = PaymentStatus.FAILED;
            emit PaymentFailed(paymentId, "Recipient transfer failed");
            return;
        }
        
        // Transfer fee to platform (if fee > 0)
        if (platformFee > 0) {
            bool feeTransfer = pyusdToken.transfer(feeRecipient, platformFee);
            if (!feeTransfer) {
                // If fee transfer fails, we still consider payment successful
                // but emit a warning event
                emit PaymentFailed(paymentId, "Fee transfer failed but payment completed");
            }
        }
        
        // Mark payment as completed
        payment.status = PaymentStatus.COMPLETED;
        payment.completedAt = block.timestamp;
        
        emit PaymentCompleted(paymentId, block.timestamp);
    }
    
    /**
     * @dev Get payment status
     * @param paymentId The payment identifier
     * @return status Current status of the payment
     */
    function getPaymentStatus(bytes32 paymentId) external view returns (PaymentStatus status) {
        if (payments[paymentId].sender == address(0)) revert PaymentNotFound();
        return payments[paymentId].status;
    }
    
    /**
     * @dev Get payment details
     * @param paymentId The payment identifier
     * @return payment Full payment information
     */
    function getPayment(bytes32 paymentId) external view returns (Payment memory payment) {
        if (payments[paymentId].sender == address(0)) revert PaymentNotFound();
        return payments[paymentId];
    }
    
    /**
     * @dev Get user's payment history
     * @param user Address of the user
     * @return paymentIds Array of payment IDs associated with the user
     */
    function getUserPayments(address user) external view returns (bytes32[] memory paymentIds) {
        return userPayments[user];
    }
    
    /**
     * @dev Calculate platform fee for a given amount
     * @param amount The payment amount
     * @return fee The calculated platform fee
     */
    function calculatePlatformFee(uint256 amount) external view returns (uint256 fee) {
        return (amount * platformFeeRate) / 10000;
    }
    
    /**
     * @dev Emergency refund function (only owner)
     * @param paymentId The payment identifier to refund
     */
    function emergencyRefund(bytes32 paymentId) external onlyOwner {
        Payment storage payment = payments[paymentId];
        
        if (payment.sender == address(0)) revert PaymentNotFound();
        if (payment.status == PaymentStatus.COMPLETED) revert PaymentAlreadyProcessed();
        if (payment.status == PaymentStatus.REFUNDED) revert PaymentAlreadyProcessed();
        
        // Calculate refund amount (full amount if not completed)
        uint256 refundAmount = payment.amount;
        
        // Update payment status
        payment.status = PaymentStatus.REFUNDED;
        payment.completedAt = block.timestamp;
        
        // Transfer refund to original sender
        bool success = pyusdToken.transfer(payment.sender, refundAmount);
        if (!success) revert TransferFailed();
        
        emit PaymentRefunded(paymentId, refundAmount);
    }
    
    /**
     * @dev Update platform fee rate (only owner)
     * @param newFeeRate New fee rate in basis points (e.g., 25 = 0.25%)
     */
    function updateFeeRate(uint256 newFeeRate) external onlyOwner {
        if (newFeeRate > MAX_FEE_RATE) revert InvalidFeeRate();
        
        uint256 oldRate = platformFeeRate;
        platformFeeRate = newFeeRate;
        
        emit FeeRateUpdated(oldRate, newFeeRate);
    }
    
    /**
     * @dev Update fee recipient address (only owner)
     * @param newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid fee recipient address");
        
        address oldRecipient = feeRecipient;
        feeRecipient = newFeeRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, newFeeRecipient);
    }
    
    /**
     * @dev Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal function (only owner, when paused)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner whenPaused {
        require(token != address(0), "Invalid token address");
        
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @dev Get contract statistics
     * @return _totalPayments Total number of payments processed
     * @return _totalVolume Total volume of payments processed
     * @return _contractBalance Current PYUSD balance of the contract
     */
    function getContractStats() external view returns (
        uint256 _totalPayments,
        uint256 _totalVolume,
        uint256 _contractBalance
    ) {
        return (
            totalPayments,
            totalVolume,
            pyusdToken.balanceOf(address(this))
        );
    }
}