import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  walletAddress: {
    type: String,
    required: [true, 'Wallet address is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  isKycVerified: {
    type: Boolean,
    default: false,
  },
  isFlagged: {
    type: Boolean,
    default: false,
  },
  isFrozen: {
    type: Boolean,
    default: false,
  },
  quarantinedFingerprints: {
    type: [String],
    default: [],
  },
  kycTimestamp: {
    type: Date,
    default: Date.now,
  },
  hasConsentedToPrivacyPolicy: {
    type: Boolean,
    default: false,
  },
  consentTimestamp: {
    type: Date,
    default: null,
  },
  consentVersion: {
    type: String,
    default: 'v1.0',
  },
});

const User = models.User || model('User', UserSchema);
export default User;

