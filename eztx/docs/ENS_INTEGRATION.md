# ENS Integration Documentation

## Overview

The application now uses a real ENS (Ethereum Name Service) resolver instead of mock services. This allows users to enter ENS names (like `alice.eth`) in the payment form, and the application will resolve them to Ethereum addresses.

## Implementation

### ENS Resolver

- **Real Implementation**: `SepoliaENSResolver` - Uses ethers.js to resolve ENS names on Sepolia testnet
- **Mock Implementation**: `MockENSResolver` - For testing and development

### Service Factory

The `ENSServiceFactory` manages which resolver to use based on configuration:

```typescript
import { createENSServiceFactory } from '@/services/ENSServiceFactory';

const factory = createENSServiceFactory();
const resolver = factory.getENSResolver();
```

### React Hook

The `useENS` hook provides a convenient way to use ENS resolution in React components:

```typescript
import { useENS } from '@/hooks/useENS';

function MyComponent() {
  const { 
    resolvedAddress, 
    resolvedENS, 
    isResolving, 
    error, 
    resolveENS 
  } = useENS();

  // Resolve an ENS name
  await resolveENS('alice.eth');
}
```

## Configuration

### Environment Variables

```bash
# Use real ENS resolver (set to false for production)
NEXT_PUBLIC_USE_MOCK_SERVICES=false

# Infura API key for Sepolia testnet
NEXT_PUBLIC_INFURA_API_KEY=your_infura_api_key_here

# Optional: Custom RPC URL
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
```

### Service Configuration

The service automatically detects the environment and uses the appropriate resolver:

- **Development/Testing**: Can use mock services if `NEXT_PUBLIC_USE_MOCK_SERVICES=true`
- **Production**: Uses real ENS resolver with Sepolia testnet

## Features

### ENS Name Resolution

- Validates ENS name format (e.g., `alice.eth`)
- Resolves ENS names to Ethereum addresses
- Handles resolution errors gracefully
- Shows loading states during resolution

### Address Validation

- Validates Ethereum address format (0x followed by 40 hex characters)
- Supports both ENS names and direct addresses
- Real-time validation with debouncing

### Error Handling

- Network errors (resolver unavailable)
- Invalid ENS name format
- ENS name not found
- Invalid Ethereum address format

## Usage in PaymentForm

The PaymentForm component now automatically:

1. Detects if the input is an ENS name (contains `.eth`)
2. Validates the ENS name format
3. Resolves the ENS name to an address
4. Shows the resolved address to the user
5. Uses the resolved address for the payment

### User Experience

- **ENS Input**: User types `alice.eth`
- **Validation**: Real-time format validation
- **Resolution**: Automatic resolution with loading indicator
- **Display**: Shows resolved address in a success box
- **Error Handling**: Clear error messages for failed resolutions

## Testing

### Unit Tests

- `ENSServiceFactory.test.ts` - Tests service factory functionality
- `useENS.test.ts` - Tests React hook functionality

### Mock Data

The MockENSResolver includes test ENS names:
- `alice.eth` → `0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6`
- `bob.eth` → `0x8ba1f109551bD432803012645Hac136c22C177ec`
- `test.eth` → Various test addresses

## Network Support

Currently supports:
- **Sepolia Testnet**: Primary network for ENS resolution
- **Local Development**: Mock services for testing

Future support planned for:
- **Ethereum Mainnet**: Production ENS resolution
- **Other L2 networks**: As needed

## Security Considerations

- ENS resolution is performed client-side
- No private keys or sensitive data involved
- Uses read-only RPC endpoints
- Validates all inputs before processing
- Handles network failures gracefully

## Troubleshooting

### Common Issues

1. **ENS Resolution Fails**
   - Check Infura API key is valid
   - Verify network connectivity
   - Ensure ENS name exists on Sepolia

2. **Invalid ENS Format**
   - ENS names must end with `.eth`
   - Must be 5+ characters total
   - Cannot start/end with hyphens
   - Cannot contain consecutive hyphens

3. **Network Errors**
   - Check RPC URL configuration
   - Verify Infura service status
   - Try with mock services for testing

### Debug Mode

Set `NEXT_PUBLIC_USE_MOCK_SERVICES=true` to use mock services for debugging.