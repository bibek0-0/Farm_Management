import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMilkEntry extends Document {
  farmer: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'evening';
  quantityLiters: number;
  ratePerLiter: number;
  totalAmount: number;
  fat?: number | null;
  snf?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const MilkEntrySchema = new Schema<IMilkEntry>(
  {
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
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
      min: 0,
    },
    ratePerLiter: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    fat: {
      type: Number,
      required: false,
      default: null,
    },
    snf: {
      type: Number,
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

// Enforce one entry per farmer per date per shift
MilkEntrySchema.index({ farmer: 1, date: 1, shift: 1 }, { unique: true });

const MilkEntry: Model<IMilkEntry> =
  mongoose.models.MilkEntry ||
  mongoose.model<IMilkEntry>('MilkEntry', MilkEntrySchema);

export default MilkEntry;
