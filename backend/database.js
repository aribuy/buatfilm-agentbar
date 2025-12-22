import mongoose from 'mongoose';

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  snapToken: String,
  transactionId: String,
  createdAt: { type: Date, default: Date.now },
  paidAt: Date
});

export const Order = mongoose.model('Order', orderSchema);

// Database connection
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/buatfilm');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};