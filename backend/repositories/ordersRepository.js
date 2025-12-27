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

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find or create customer
      let customerResult;
      const customerQuery = `
        SELECT id FROM customers
        WHERE tenant_id = $1 AND email = $2
      `;
      customerResult = await client.query(customerQuery, [tenantId, email]);

      let customerId;
      if (customerResult.rows.length > 0) {
        customerId = customerResult.rows[0].id;
      } else {
        // Create new customer
        const insertCustomerQuery = `
          INSERT INTO customers (tenant_id, email, phone, name)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `;
        const newCustomer = await client.query(insertCustomerQuery, [tenantId, email, phone, customerName]);
        customerId = newCustomer.rows[0].id;
      }

      // Create order
      const orderQuery = `
        INSERT INTO orders (
          tenant_id,
          customer_id,
          order_id,
          gross_amount,
          payment_method,
          payment_status
        )
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *
      `;

      const result = await client.query(orderQuery, [
        tenantId,
        customerId,
        id,
        amount,
        paymentMethod
      ]);

      await client.query('COMMIT');

      console.log(`[PostgreSQL] Order created: ${id} (customer: ${customerId})`);
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] Create order error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get order by order_id
   */
  async getOrder(orderId) {
    const query = `
      SELECT
        o.id,
        o.order_id,
        c.name as customer_name,
        c.email,
        c.phone,
        o.gross_amount::text as amount, -- Return as string for compatibility
        o.payment_method,
        o.payment_status as status,
        o.created_at
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.order_id = $1
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
        o.id,
        o.order_id,
        c.name as customer_name,
        c.email,
        c.phone,
        o.gross_amount::text as amount,
        o.payment_method,
        o.payment_status as status,
        o.created_at
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
    `;

    const params = [];

    if (tenantId) {
      query += ' WHERE o.tenant_id = $1 ORDER BY o.created_at DESC';
      params.push(tenantId);
    } else {
      query += ' ORDER BY o.created_at DESC';
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
