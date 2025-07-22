import { ethers, JsonRpcProvider, Networkish } from 'ethers';
import { Logger } from '@nestjs/common';

/**
 * The Reef RPC node uses a custom `evm_call` method instead of the standard `eth_call`.
 * It also seems to have issues with network auto-detection.
 *
 * This custom provider class extends ethers' `JsonRpcProvider` to address these issues:
 * 1. It intercepts requests for the `eth_call` method and replaces them with `evm_call`.
 * 2. It formats the parameters for `evm_call` as the Reef node expects.
 * 3. It handles the `eth_chainId` method by returning a hardcoded value.
 * 4. It overrides `getNetwork()` to always return the correct Reef network configuration.
 */
export class ReefJsonRpcProvider extends JsonRpcProvider {
  private readonly logger = new Logger(ReefJsonRpcProvider.name);

  constructor(url: string, network?: Networkish) {
    // Pass the network directly to prevent auto-detection issues.
    super(url, network);
  }

  // Override getNetwork to always return the correct Reef network configuration
  async getNetwork(): Promise<ethers.Network> {
    return new ethers.Network('reef-mainnet', 13939n);
  }

  async send(method: string, params: any[]): Promise<any> {
    // The Reef RPC node doesn't support `eth_chainId`. We hardcode it here.
    // The mainnet chainId is 13939 (0x3673).
    if (method === 'eth_chainId') {
      this.logger.log(
        'Intercepting eth_chainId and returning hardcoded value.',
      );
      return Promise.resolve('0x3673');
    }

    if (method === 'eth_call') {
      this.logger.log(
        `Intercepting eth_call with params: ${JSON.stringify(params)}`,
      );

      const [callData, blockTag] = params;

      // The Reef RPC node requires a specific block hash for the 'at' parameter in 'evm_call',
      // it does not accept string tags like "latest" which ethers.js uses by default.
      // We will resolve the block tag to the latest block hash before making the call.
      const blockHash = await super.send('chain_getHead', []);

      this.logger.log(
        `Resolved block tag "${blockTag}" to block hash ${blockHash}`,
      );

      // The Reef node expects the block parameter to be an object with a 'header' property,
      // not just a string hash.
      const reefCallData = {
        ...callData,
        storageLimit: 0,
      };

      this.logger.log(
        `Sending evm_call with new params: [${JSON.stringify(reefCallData)}]`,
      );

      return super.send('evm_call', [reefCallData]);
    }

    // For all other methods, pass them through unmodified.
    return super.send(method, params);
  }
}
