import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMilkSale extends Document {
  buyerName: string;
  date: string; // YYYY-MM-DD (Bikram Sambat)
  shift: 'morning' | 'evening';
  quantityLiters: number;
  ratePerLiter: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MilkSaleSchema = new Schema<IMilkSale>(
  {
    buyerName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    shift: {
      type: String,
      enum: ['morning', 'evening'],
      required: true,
      index: true,
    },
    quantityLiters: {
      type: Number,
      required: true,
      min: 0.01,
    },
    ratePerLiter: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending'],
      default: 'paid',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

MilkSaleSchema.index({ date: 1, shift: 1 });

const MilkSale: Model<IMilkSale> =
  mongoose.models.MilkSale || mongoose.model<IMilkSale>('MilkSale', MilkSaleSchema);

export default MilkSale;
