const mongoose = require('mongoose');

const policeStationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Station name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
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
      },
    },
    jurisdiction: {
      type: String,
      trim: true,
    },
    isWomenCell: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

policeStationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('PoliceStation', policeStationSchema);
