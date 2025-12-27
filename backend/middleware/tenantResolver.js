// =====================================================
// TENANT RESOLUTION MIDDLEWARE
// Detects tenant from subdomain or header
// =====================================================

const { getTenantBySlug, verifyTenantAccess } = require('../services/tenantService');

/**
 * Resolve tenant from request
 * Priority:
 * 1. X-Tenant-Slug header (from nginx)
 * 2. Subdomain extraction from Host header
 * 3. Query parameter (testing fallback)
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
async function resolveTenant(req, res, next) {
  try {
    let tenantSlug = null;

    // Method 1: From nginx header (most reliable)
    if (req.headers['x-tenant-slug']) {
      tenantSlug = req.headers['x-tenant-slug'];
      console.log(`[Tenant] Resolved from header: ${tenantSlug}`);
    }
    // Method 2: Extract from subdomain
    else if (req.headers.host) {
      const host = req.headers.host; // buatfilm.agentbar.ai
      const subdomain = host.split('.')[0]; // buatfilm

      // Skip platform domains
      if (!['funnel', 'funnelstaging', 'www', 'admin'].includes(subdomain)) {
        tenantSlug = subdomain;
        console.log(`[Tenant] Resolved from subdomain: ${tenantSlug}`);
      }
    }
    // Method 3: Query parameter (testing only)
    else if (req.query.tenant) {
      tenantSlug = req.query.tenant;
      console.log(`[Tenant] Resolved from query: ${tenantSlug}`);
    }

    // If no tenant found, return 404
    if (!tenantSlug) {
      console.warn('[Tenant] No tenant found in request');
      return res.status(404).json({
        error: 'Tenant not found',
        message: 'Please provide a valid tenant subdomain'
      });
    }

    // Verify tenant access and load tenant data
    const verification = await verifyTenantAccess(tenantSlug);

    if (!verification.valid) {
      console.error(`[Tenant] Access denied: ${verification.reason}`);
      return res.status(403).json({
        error: 'Tenant access denied',
        message: verification.reason
      });
    }

    const tenant = verification.tenant;

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;

    // Add tenant context to all logs
    console.log(`[Tenant] ✓ Authenticated: ${tenant.name} (${tenant.slug})`);
    console.log(`[Tenant] ✓ Plan: ${tenant.plan}`);

    next();
  } catch (error) {
    console.error('[Tenant] Resolution error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve tenant'
    });
  }
}

/**
 * Optional tenant resolver (doesn't fail if no tenant)
 * For endpoints that work with or without tenant context
 */
async function optionalTenant(req, res, next) {
  try {
    let tenantSlug = null;

    if (req.headers['x-tenant-slug']) {
      tenantSlug = req.headers['x-tenant-slug'];
    } else if (req.headers.host) {
      const host = req.headers.host;
      const subdomain = host.split('.')[0];
      if (!['funnel', 'funnelstaging', 'www', 'admin'].includes(subdomain)) {
        tenantSlug = subdomain;
      }
    } else if (req.query.tenant) {
      tenantSlug = req.query.tenant;
    }

    if (tenantSlug) {
      const verification = await verifyTenantAccess(tenantSlug);
      if (verification.valid) {
        req.tenant = verification.tenant;
        req.tenantId = verification.tenant.id;
        req.tenantSlug = verification.tenant.slug;
        console.log(`[Tenant] Optional context loaded: ${tenantSlug}`);
      }
    }

    next();
  } catch (error) {
    // Don't fail, just continue without tenant context
    console.warn('[Tenant] Optional resolution failed, continuing without tenant:', error.message);
    next();
  }
}

module.exports = {
  resolveTenant,
  optionalTenant
};
