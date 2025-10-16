import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum TransactionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

@Entity("relayer_transactions")
@Index(["lt", "hash"], { unique: true })
export class TransactionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  @Index()
  lt: string; // Logical time of the transaction

  @Column({ type: "varchar", length: 1000 })
  @Index()
  hash: string; // Transaction hash

  @Column({ type: "varchar", length: 255 })
  @Index()
  userAddress: string; // User who paid for subscription

  @Column({ type: "varchar", length: 255 })
  @Index()
  fromAddress: string; // Subscription contract address

  @Column({ type: "varchar", length: 255 })
  toAddress: string; // Relayer address

  @Column({ type: "bigint" })
  amountNanotons: string; // Amount in nanotons (2/3 of subscription price)

  @Column({ type: "bigint", nullable: true })
  jettonAmount: string; // Amount of jettons received from swap

  @Column({
    type: "enum",
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  @Index()
  status: TransactionStatus;

  @Column({ type: "text", nullable: true })
  errorMessage: string; // Error message if processing failed

  @Column({ type: "int", default: 0 })
  retryCount: number; // Number of retry attempts

  @Column({ type: "varchar", length: 1000, nullable: true })
  txHash: string; // Original transaction hash from backend

  @Column({ type: "varchar", length: 255, nullable: true })
  type: string; // Transaction type (subscription, etc.)

  @Column({ type: "varchar", length: 255, nullable: true })
  amount: string; // Amount in TON (for display)

  @Column({ type: "timestamp", nullable: true })
  processedAt: Date; // When transaction was processed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
