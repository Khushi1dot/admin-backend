const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  avatar: String,
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  phoneNumber: String,
  address: String,
  state: String,
  zipCode: String,
  country: String,
  language: { type: [String] },
  timeZone: String,
  currency: String,
  organization: String,
  status:{
    type:String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
}, { timestamps: true });

// ✅ Correct placement of virtual field
userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'user',
});

// ✅ Enable virtuals in `toObject` and `toJSON`
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("User's", userSchema); 
