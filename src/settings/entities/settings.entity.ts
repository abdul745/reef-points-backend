// filepath: src/settings/entities/settings.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 0 })
  totalPools: number;

  @Column({ type: 'boolean', default: false })
  isBootstrapping: boolean;

  @Column({ type: 'boolean', default: false })
  isEarlySzn: boolean;

  @Column({ type: 'boolean', default: false })
  isMemeSzn: boolean;
}