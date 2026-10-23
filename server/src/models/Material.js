const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png',
      ],
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 25 * 1024 * 1024,
    },
    storagePath: {
      type: String,
      required: true,
      unique: true,
    },
    checksum: {
      type: String,
      required: true,
      match: /^[a-f0-9]{64}$/,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

materialSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Material', materialSchema);