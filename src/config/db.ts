import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.DB_STRING || '');
    console.log(`Successful connection to DB: ${conn.connection.host}`);
  } catch (error) {
    console.log('Error connecting to DB: ', error);
    process.exit(1);
  }
};

export default connectDB;
