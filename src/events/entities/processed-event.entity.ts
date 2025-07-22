import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class ProcessedEvent {
  @PrimaryColumn()
  eventId: string;

  @Column()
  blockNumber: number;
}
 