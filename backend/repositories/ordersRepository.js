// =====================================================
// ORDERS REPOSITORY (PostgreSQL)
// Compatible interface with existing SQLite database.js
// =====================================================

const pool = require('../db-postgres');

class OrdersRepository {
  /**
   * Create new order
   */
  async createOrder(orderData) {
    const { id, customerName, email, phone, amount, paymentMethod, tenantId = null } = orderData;

    const query = `
      INSERT INTO orders (
        order_id,
        customer_name,
        email,
        phone,
        gross_amount,
        payment_method,
        payment_status,
        tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        id,
        customerName,
        email,
        phone,
        amount,
        paymentMethod,
        tenantId
      ]);

      console.log(`[PostgreSQL] Order created: ${id}`);
      return result.rows[0];
    } catch (error) {
      console.error('[PostgreSQL] Create order error:', error);
      throw error;
    }
  }

  /**
   * Get order by order_id
   */
  async getOrder(orderId) {
    const query = `
      SELECT
        id,
        order_id,
        customer_name,
        email,
        phone,
        gross_amount::text as amount, -- Return as string for compatibility
        payment_method,
        payment_status as status,
        created_at
      FROM orders
      WHERE order_id = $1
    `;

    try {
      const result = await pool.query(query, [orderId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[PostgreSQL] Get order error:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    const query = `
      UPDATE orders
      SET
        payment_status = $1,
        updated_at = NOW()
      WHERE order_id = $2
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [status, orderId]);

      if (result.rows.length > 0) {
        console.log(`[PostgreSQL] Order ${orderId} updated to: ${status}`);
        return result.rows[0];
      }

      return null;
    } catch (error) {
      console.error('[PostgreSQL] Update order error:', error);
      throw error;
    }
  }

  /**
   * Get all orders (with optional tenant filtering)
   */
  async getAllOrders(tenantId = null) {
    let query = `
      SELECT
        id,
        order_id,
        customer_name,
        email,
        phone,
        gross_amount::text as amount,
        payment_method,
        payment_status as status,
        created_at
      FROM orders
    `;

    const params = [];

    if (tenantId) {
      query += ' WHERE tenant_id = $1 ORDER BY created_at DESC';
      params.push(tenantId);
    } else {
      query += ' ORDER BY created_at DESC';
    }

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PostgreSQL] Get all orders error:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(tenantId) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE payment_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid,
        COUNT(*) FILTER (WHERE payment_status = 'failed') as failed,
        COUNT(*) FILTER (WHERE payment_status = 'expired') as expired,
        SUM(gross_amount) FILTER (WHERE payment_status = 'paid') as revenue
      FROM orders
      WHERE tenant_id = $1
    `;

    try {
      const result = await pool.query(query, [tenantId]);
      return result.rows[0];
    } catch (error) {
      console.error('[PostgreSQL] Get order stats error:', error);
      throw error;
    }
  }
}

module.exports = new OrdersRepository();
