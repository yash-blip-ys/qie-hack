import mongoose, { Schema, models, model } from 'mongoose';

export interface TransferEventDocument extends mongoose.Document {
  txHash: string;
  sender: string;
  recipient?: string | null;
  amountQUSD: string;
  targetCurrency?: string | null;
  blockNumber: number;
  timestamp: number;
  chainId: number;
  type: 'cross-border' | 'swap';
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransferEventSchema = new Schema<TransferEventDocument>(
  {
    txHash: { type: String, required: true, unique: true, index: true },
    sender: { type: String, required: true, lowercase: true },
    recipient: { type: String, lowercase: true, default: null },
    amountQUSD: { type: String, required: true },
    targetCurrency: { type: String, default: null },
    blockNumber: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    chainId: { type: Number, required: true },
    type: { type: String, enum: ['cross-border', 'swap'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const TransferEvent =
  (models.TransferEvent as mongoose.Model<TransferEventDocument>) ||
  model<TransferEventDocument>('TransferEvent', TransferEventSchema);

export default TransferEvent;

