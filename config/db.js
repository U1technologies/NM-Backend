
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    console.log("MONGODB_URI:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
};

module.exports = connectDB;

// const mongoose = require('mongoose');

// const connectDB = async () => {
//   try {
//     const mongoURI = 'mongodb+srv://garimanarayan1804:51rKUWxmC7h3c8R5@nextag.bqd8e.mongodb.net/formDB';

//     console.log("MONGODB_URI:", mongoURI);
    
//     await mongoose.connect(mongoURI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });

//     console.log('MongoDB connected');
//   } catch (err) {
//     console.error('Database connection failed:', err);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;
