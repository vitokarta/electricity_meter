require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Successfully connected to MongoDB');
  console.log('Database name:', mongoose.connection.name);
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
}).finally(() => {
  mongoose.connection.close();
});