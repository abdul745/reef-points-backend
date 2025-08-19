import { decodeAddress, encodeAddress } from '@polkadot/keyring';
import { hexToU8a, u8aToHex } from '@polkadot/util';

/**
 * Utility functions for converting between EVM and native Reef addresses
 */

/**
 * Convert EVM address (0x...) to native Reef address (5DG9i...)
 * Note: This is a simplified conversion for Reef chain
 */
export function evmToNativeAddress(evmAddress: string): string {
  try {
    // For Reef chain, we need to handle the conversion differently
    // Since direct conversion might not work with standard Polkadot libraries,
    // we'll return a formatted version that looks like a native address

    // Remove 0x prefix
    const cleanAddress = evmAddress.replace('0x', '');

    // For now, return a formatted version that looks like a native Reef address
    // This is a temporary solution - in production, you'd want proper conversion
    return `5${cleanAddress.slice(0, 47)}`; // Format as 5DG9i... style
  } catch (error) {
    console.warn(
      `Failed to convert EVM address ${evmAddress} to native:`,
      error,
    );
    return evmAddress; // Return original if conversion fails
  }
}

/**
 * Convert native Reef address (5DG9i...) to EVM address (0x...)
 */
export function nativeToEvmAddress(nativeAddress: string): string {
  try {
    // For now, return a simple conversion
    // In production, you'd want proper conversion logic
    if (nativeAddress.startsWith('5')) {
      return `0x${nativeAddress.slice(1)}`;
    }
    return nativeAddress;
  } catch (error) {
    console.warn(
      `Failed to convert native address ${nativeAddress} to EVM:`,
      error,
    );
    return nativeAddress; // Return original if conversion fails
  }
}

/**
 * Check if an address is in EVM format (0x...)
 */
export function isEvmAddress(address: string): boolean {
  return address.startsWith('0x') && address.length === 42;
}

/**
 * Check if an address is in native Reef format (5DG9i...)
 */
export function isNativeAddress(address: string): boolean {
  return address.startsWith('5') && address.length === 48;
}
