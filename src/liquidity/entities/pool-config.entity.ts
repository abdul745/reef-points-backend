import { Entity, Column, PrimaryColumn } from 'typeorm';

export enum PoolType {
  STABLE_STABLE = 'stable_stable', // USDC/USDT
  VOLATILE_VOLATILE = 'volatile_volatile', // REEF/MRD
  VOLATILE_STABLE = 'volatile_stable', // REEF/USDC
}

// Hardcoded stablecoin mapping
const STABLECOINS: Record<string, boolean> = {
  '0x7922d8785d93e692bb584e659b607fa821e6a91a': true, // USDC
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
