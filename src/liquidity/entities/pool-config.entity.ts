import { Entity, Column, PrimaryColumn } from 'typeorm';
import { CONFIG } from '../../config/constants';

export enum PoolType {
  STABLE_STABLE = 'stable_stable', // USDC/USDT
  VOLATILE_VOLATILE = 'volatile_volatile', // REEF/MRD
  VOLATILE_STABLE = 'volatile_stable', // REEF/USDC
}

// Stablecoin mapping from environment
const STABLECOINS: Record<string, boolean> = {
  [CONFIG.USDC_TOKEN_ADDRESS]: true, // USDC
};

function isStablecoin(address: string): boolean {
  return !!STABLECOINS[address.toLowerCase()];
}

@Entity()
export class PoolConfig {
  @PrimaryColumn()
  poolAddress: string;

  @Column()
  token0Address: string;

  @Column()
  token1Address: string;

  @Column({
    type: 'enum',
    enum: PoolType,
    default: PoolType.VOLATILE_STABLE,
  })
  poolType: PoolType;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  bootstrappingEligible: boolean;

  @Column({ type: 'boolean', default: false })
  earlySznEligible: boolean;

  @Column({ type: 'boolean', default: false })
  memeSznEligible: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  static detectPoolType(
    token0Address: string,
    token1Address: string,
  ): PoolType {
    const isStable0 = isStablecoin(token0Address);
    const isStable1 = isStablecoin(token1Address);
    if (isStable0 && isStable1) return PoolType.STABLE_STABLE;
    if (!isStable0 && !isStable1) return PoolType.VOLATILE_VOLATILE;
    return PoolType.VOLATILE_STABLE;
  }
}
