import { ENSError } from '../types/errors';
import { ethers } from 'ethers';

export interface ENSResolver {
    resolveENS(ensName: string): Promise<string | null>;
    reverseResolve(address: string): Promise<string | null>;
    validateENSName(ensName: string): boolean;
}

export class SepoliaENSResolver implements ENSResolver {
    private provider: ethers.Provider;

    constructor(rpcUrl?: string) {
        const defaultRpcUrl = `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`;
        this.provider = new ethers.JsonRpcProvider(rpcUrl || defaultRpcUrl);
    }

    validateENSName(ensName: string): boolean {
        const ensRegex = /^[a-zA-Z0-9-]+\.eth$/;
        if (!ensRegex.test(ensName)) return false;
        if (ensName.length < 5 || ensName.length > 255) return false;
        const name = ensName.replace('.eth', '');
        if (name.startsWith('-') || name.endsWith('-')) return false;
        if (name.includes('--')) return false;
        return true;
    }

    private validateEthereumAddress(address: string): boolean {
        return ethers.isAddress(address);
    }

    async resolveENS(ensName: string): Promise<string | null> {
        if (!ensName) {
            throw new ENSError('ENS name cannot be empty', 'INVALID_ENS_NAME');
        }

        if (!this.validateENSName(ensName)) {
            throw new ENSError(`Invalid ENS name format: ${ensName}`, 'INVALID_ENS_NAME');
        }

        try {
            const address = await this.provider.resolveName(ensName);
            return address ?? null;
        } catch (err: any) {
            throw new ENSError(
                `Failed to resolve ENS: ${err.message}`,
                'RESOLVER_UNAVAILABLE'
            );
        }
    }

    async reverseResolve(address: string): Promise<string | null> {
        if (!this.validateEthereumAddress(address)) {
            throw new ENSError(`Invalid Ethereum address format: ${address}`, 'INVALID_ADDRESS');
        }

        try {
            const ensName = await this.provider.lookupAddress(address);
            return ensName ?? null;
        } catch (err: any) {
            throw new ENSError(
                `Failed reverse resolution: ${err.message}`,
                'RESOLVER_UNAVAILABLE'
            );
        }
    }
}
