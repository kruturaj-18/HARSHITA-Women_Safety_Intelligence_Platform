const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
          },
          message: 'Invalid coordinates [longitude, latitude]',
        },
      },
    },
    areaName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: ['harassment', 'stalking', 'assault', 'theft', 'eve_teasing', 'unsafe_area', 'other'],
      required: [true, 'Category is required'],
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
    },
    incidentDate: {
      type: Date,
      default: Date.now,
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        if (ret.isAnonymous) {
          delete ret.reportedBy;
        }
        return ret;
      },
    },
  }
);

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ category: 1 });
incidentSchema.index({ incidentDate: -1 });
incidentSchema.index({ areaName: 1, status: 1 });

incidentSchema.pre('save', function (next) {
  if (this.incidentDate) {
    const hours = new Date(this.incidentDate).getHours();
    if (hours >= 5 && hours < 12) this.timeOfDay = 'morning';
    else if (hours >= 12 && hours < 17) this.timeOfDay = 'afternoon';
    else if (hours >= 17 && hours < 21) this.timeOfDay = 'evening';
    else this.timeOfDay = 'night';
  }
  next();
});

module.exports = mongoose.model('Incident', incidentSchema);
