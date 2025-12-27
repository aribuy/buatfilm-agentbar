// =====================================================
// TENANT SETTINGS SERVICE
// Fetches tenant configuration from database
// =====================================================

const pool = require('../db-postgres');

/**
 * Get tenant by slug (from subdomain)
 * @param {string} tenantSlug - Tenant slug (e.g., 'buatfilm')
 * @returns {Promise<Object>} Tenant object
 */
async function getTenantBySlug(tenantSlug) {
  const query = `
    SELECT
      id,
      name,
      slug,
      plan,
      status,
      midtrans_environment,
      midtrans_server_key,
      midtrans_client_key,
      midtrans_merchant_id,
      email_from,
      email_reply_to,
      whatsapp_enabled,
      whatsapp_api_url,
      whatsapp_api_token,
      logo_url,
      primary_color,
      max_orders_per_month,
      max_admin_users
    FROM tenants
    WHERE slug = $1 AND status = 'active'
  `;

  try {
    const result = await pool.query(query, [tenantSlug]);

    if (result.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantSlug}`);
    }

    const tenant = result.rows[0];

    console.log(`[Tenant] Loaded: ${tenant.name} (${tenant.slug})`);
    console.log(`[Tenant] Plan: ${tenant.plan}`);
    console.log(`[Tenant] Midtrans: ${tenant.midtrans_environment}`);

    return tenant;
  } catch (error) {
    console.error(`[Tenant] Failed to load tenant ${tenantSlug}:`, error.message);
    throw error;
  }
}

/**
 * Get specific tenant setting
 * @param {string} tenantSlug - Tenant slug
 * @param {string} key - Setting key (e.g., 'midtrans.server_key')
 * @returns {Promise<string>} Setting value
 */
async function getTenantSetting(tenantSlug, key) {
  const query = `
    SELECT s.value
    FROM settings s
    JOIN tenants t ON t.id = s.tenant_id
    WHERE t.slug = $1 AND s.key = $2
  `;

  try {
    const result = await pool.query(query, [tenantSlug, key]);

    if (result.rows.length === 0) {
      console.warn(`[Tenant] Setting not found: ${tenantSlug}.${key}`);
      return null;
    }

    return result.rows[0].value;
  } catch (error) {
    console.error(`[Tenant] Failed to get setting ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get all tenant settings as key-value object
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<Object>} All settings
 */
async function getTenantSettings(tenantSlug) {
  const query = `
    SELECT s.key, s.value, s.value_type
    FROM settings s
    JOIN tenants t ON t.id = s.tenant_id
    WHERE t.slug = $1
  `;

  try {
    const result = await pool.query(query, [tenantSlug]);

    // Convert to object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    return settings;
  } catch (error) {
    console.error(`[Tenant] Failed to load settings:`, error.message);
    throw error;
  }
}

/**
 * Verify tenant is active and within limits
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<Object>} Verification result
 */
async function verifyTenantAccess(tenantSlug) {
  try {
    const tenant = await getTenantBySlug(tenantSlug);

    // Check if tenant is active
    if (tenant.status !== 'active') {
      return {
        valid: false,
        reason: 'Tenant is not active',
        tenant: null
      };
    }

    // Check order limits (optional)
    const statsQuery = `
      SELECT COUNT(*) as orders_this_month
      FROM orders
      WHERE tenant_id = $1
        AND created_at >= DATE_TRUNC('month', NOW())
    `;

    const statsResult = await pool.query(statsQuery, [tenant.id]);
    const ordersThisMonth = parseInt(statsResult.rows[0].orders_this_month);

    if (ordersThisMonth >= tenant.max_orders_per_month) {
      return {
        valid: false,
        reason: 'Monthly order limit exceeded',
        tenant: null
      };
    }

    return {
      valid: true,
      tenant: tenant,
      stats: {
        ordersThisMonth,
        maxOrders: tenant.max_orders_per_month
      }
    };
  } catch (error) {
    console.error('[Tenant] Verification failed:', error.message);
    return {
      valid: false,
      reason: error.message,
      tenant: null
    };
  }
}

module.exports = {
  getTenantBySlug,
  getTenantSetting,
  getTenantSettings,
  verifyTenantAccess
};
