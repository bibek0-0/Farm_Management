import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'upper_admin' | 'admin';

export interface IAdminSettings extends Document {
  username: string;
  passwordHash: string;
  role: UserRole;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AdminSettings collection stores administrative user accounts.
 * Supported roles:
 * - 'upper_admin': Master administrator (bibek) with full privileges and ability to manage admin accounts.
 * - 'admin': Standard administrator (admin) with access to all daily farm operations.
 */
const AdminSettingsSchema = new Schema<IAdminSettings>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['upper_admin', 'admin'],
      default: 'admin',
    },
    name: {
      type: String,
      trim: true,
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
