// ./models/MeterInfo.js
const mongoose = require('mongoose');

const meterInfoSchema = new mongoose.Schema({
  meterNumber: { type: String, required: true, unique: true },
  installationLocation: { type: String, required: true },
  campus: { type: String, required: true },
  meterType: { type: String, enum: ['digital', 'mechanical'], required: true },
  brand: String,
  ct: String,
  unit: String,
  wiringMethod: String
});

module.exports = mongoose.model('MeterInfo', meterInfoSchema);