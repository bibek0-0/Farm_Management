import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminSettings extends Document {
  username: string;
  passwordHash: string;
  updatedAt: Date;
}

/**
 * AdminSettings uses a singleton pattern — only one document should
 * ever exist in this collection. Queries should use findOne() with no filter.
 * The document is auto-seeded on first login if it doesn't exist.
 */
const AdminSettingsSchema = new Schema<IAdminSettings>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // provides createdAt and updatedAt automatically
  }
);

const AdminSettings: Model<IAdminSettings> =
  mongoose.models.AdminSettings ||
  mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema);

export default AdminSettings;
