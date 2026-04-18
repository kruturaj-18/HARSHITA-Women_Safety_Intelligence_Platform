const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true,
      unique: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    safetyScore: {
      type: Number,
      default: 75,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ['safe', 'moderate', 'high_risk'],
      default: 'safe',
    },
    totalIncidents: {
      type: Number,
      default: 0,
    },
    recentIncidents: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

areaSchema.index({ geometry: '2dsphere' });
areaSchema.index({ riskLevel: 1 });
areaSchema.index({ safetyScore: 1 });

areaSchema.methods.updateRiskLevel = function () {
  if (this.safetyScore >= 70) this.riskLevel = 'safe';
  else if (this.safetyScore >= 40) this.riskLevel = 'moderate';
  else this.riskLevel = 'high_risk';
  return this;
};

module.exports = mongoose.model('Area', areaSchema);
