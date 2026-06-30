import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  tagline: { type: String },
  description: { type: String },
  accentColor: { type: String },
  icon: { type: String },
  slotsRemaining: { type: Number, default: 110 },
  slotsFirstYear: { type: Number, default: 110 },
  slotsSecondYear: { type: Number, default: 110 },
  slotsThirdYear: { type: Number, default: 110 },
  slotsFourthYear: { type: Number, default: 110 }
});

export const Club = mongoose.model('Club', clubSchema);
