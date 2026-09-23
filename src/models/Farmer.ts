import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFarmer extends Document {
  farmerCode: string;
  name: string;
  phone?: string;
  defaultRate: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
}

const FarmerSchema = new Schema<IFarmer>({
  farmerCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  defaultRate: {
    type: Number,
    required: true,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Farmer: Model<IFarmer> =
  mongoose.models.Farmer || mongoose.model<IFarmer>('Farmer', FarmerSchema);

export default Farmer;
