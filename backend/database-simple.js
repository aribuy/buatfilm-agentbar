// In-memory storage for demo
const orders = new Map();

// Mock Order model
class Order {
  constructor(data) {
    Object.assign(this, data);
  }
  
  async save() {
    orders.set(this.orderId, this);
    return this;
  }
  
  static async findOne(query) {
    for (let [id, order] of orders) {
      if (order.orderId === query.orderId) {
        return order;
      }
    }
    return null;
  }
  
  static async findOneAndUpdate(query, update, options) {
    const order = await this.findOne(query);
    if (order) {
      Object.assign(order, update);
      orders.set(order.orderId, order);
      return order;
    }
    return null;
  }
}

const connectDB = async () => {
  console.log('✅ In-memory storage ready');
};

export { Order, connectDB };