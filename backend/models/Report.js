import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  clubId: { type: String, required: true },
  clubName: { type: String, required: true },
  submittedBy: { type: String, required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileType: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const Report = mongoose.model('Report', reportSchema);
