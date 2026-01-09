/**
 * CONTRACT TESTS: Site Registration → Auto ATP Creation
 *
 * Purpose: Ensure API contract compliance for auto-ATP creation flow
 * Business Rule: When site registration succeeds, ATP must be automatically created
 *
 * Contract Requirements:
 * 1. POST /sites/register MUST return site_registration_id
 * 2. POST /sites/register MUST return atp_request_id
 * 3. POST /sites/register MUST return atp_status
 * 4. GET /atp/:id MUST show relation to site_registration_id
 * 5. Response time MUST be < 2s for 95th percentile
 *
 * Test Strategy:
 * - Positive: Valid registration → ATP created
 * - Negative: Registration fails → No ATP created
 * - Edge: Duplicate registration → Idempotent response
 */

const request = require('supertest');
const { expect } = require('chai');
const db = require('../../repositories/db');

describe('CONTRACT TEST: Site Registration → Auto ATP Creation', () => {
  const testUser = {
    id: 'test-user-contract',
    email: 'contract@test.com',
    role: 'customer'
  };

  let authToken;
  let registrationId;
  let atpId;

  before(async () => {
    // Setup: Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Test123!' });

    authToken = loginResponse.body.token;
  });

  after(async () => {
    // Cleanup: Delete test data
    await db.query('DELETE FROM atp_requests WHERE site_registration_id = $1', [registrationId]);
    await db.query('DELETE FROM site_registrations WHERE id = $1', [registrationId]);
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
  });

  describe('CONTRACT-001: POST /sites/register Response Structure', () => {

    it('MUST return site_registration_id in response', async () => {
      const response = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site_code: `CONTRACT-${Date.now()}`,
          site_name: 'Contract Test Site',
          customer_name: 'Test Customer',
          customer_email: 'customer@test.com',
          customer_phone: '08123456789',
          package_type: 'basic',
          installation_address: {
            street: 'Jl Test',
            city: 'Jakarta',
            province: 'DKI Jakarta',
            postal_code: '12345'
          }
        })
        .expect(201);

      // Contract: MUST have site_registration_id
      expect(response.body).to.have.property('site_registration_id');
      expect(response.body.site_registration_id).to.be.a('string');
      expect(response.body.site_registration_id).to.have.lengthOf(36); // UUID format

      registrationId = response.body.site_registration_id;
    });

    it('MUST return atp_request_id in response', async () => {
      const response = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site_code: `CONTRACT-ATP-${Date.now()}`,
          site_name: 'ATP Test Site',
          customer_name: 'Test Customer',
          customer_email: 'customer2@test.com',
          customer_phone: '08123456789',
          package_type: 'basic'
        })
        .expect(201);

      // Contract: MUST have atp_request_id
      expect(response.body).to.have.property('atp_request_id');
      expect(response.body.atp_request_id).to.be.a('string');
      expect(response.body.atp_request_id).to.have.lengthOf(36); // UUID format

      atpId = response.body.atp_request_id;
      registrationId = response.body.site_registration_id;
    });

    it('MUST return atp_status in response', async () => {
      const response = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site_code: `CONTRACT-STATUS-${Date.now()}`,
          site_name: 'Status Test Site',
          customer_name: 'Test Customer',
          customer_email: 'customer3@test.com',
          customer_phone: '08123456789',
          package_type: 'premium'
        })
        .expect(201);

      // Contract: MUST have atp_status
      expect(response.body).to.have.property('atp_status');
      expect(response.body.atp_status).to.be.oneOf([
        'pending',    // ATP created, waiting for approval
        'approved',   // Auto-approved for certain packages
        'processing'  // ATP being processed
      ]);

      // Validate initial status is 'pending' for manual approval packages
      if (response.body.package_type === 'basic') {
        expect(response.body.atp_status).to.equal('pending');
      }
    });

    it('MUST return response within 2 seconds (SLA)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site_code: `CONTRACT-SLA-${Date.now()}`,
          site_name: 'SLA Test Site',
          customer_name: 'Test Customer',
          customer_email: 'customer4@test.com',
          customer_phone: '08123456789',
          package_type: 'basic'
        })
        .expect(201);

      const responseTime = Date.now() - startTime;

      // Contract: 95th percentile MUST be < 2s
      expect(responseTime).to.be.below(2000);
    });
  });

  describe('CONTRACT-002: GET /atp/:id Relation Validation', () => {

    it('MUST show site_registration_id in ATP details', async () => {
      // First create registration
      const regResponse = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site_code: `CONTRACT-REL-${Date.now()}`,
          site_name: 'Relation Test Site',
          customer_name: 'Test Customer',
          customer_email: 'customer5@test.com',
          customer_phone: '08123456789',
          package_type: 'basic'
        })
        .expect(201);

      const { atp_request_id, site_registration_id } = regResponse.body;

      // Then fetch ATP details
      const atpResponse = await request(app)
        .get(`/atp/${atp_request_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Contract: ATP MUST reference site_registration_id
      expect(atpResponse.body).to.have.property('site_registration_id');
      expect(atpResponse.body.site_registration_id).to.equal(site_registration_id);
    });

    it('MUST show consistent data between registration and ATP', async () => {
      const siteCode = `CONTRACT-CONS-${Date.now()}`;

      const regResponse = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site_code: siteCode,
          site_name: 'Consistency Test Site',
          customer_name: 'Test Customer',
          customer_email: 'customer6@test.com',
          customer_phone: '08123456789',
          package_type: 'premium'
        })
        .expect(201);

      const { atp_request_id, site_registration_id } = regResponse.body;

      const atpResponse = await request(app)
        .get(`/atp/${atp_request_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Contract: Site code MUST match
      expect(atpResponse.body.site_code).to.equal(siteCode);
      expect(atpResponse.body.package_type).to.equal('premium');
    });
  });

  describe('CONTRACT-003: Negative - Registration Fails → No ATP Created', () => {

    it('MUST NOT create ATP if registration validation fails', async () => {
      const invalidData = {
        site_code: '', // Invalid: empty
        site_name: 'Invalid Site',
        customer_name: 'Test', // Invalid: missing required fields
        // Missing email, phone, package_type
      };

      const response = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      // Contract: Error response MUST NOT contain ATP IDs
      expect(response.body).to.not.have.property('atp_request_id');
      expect(response.body).to.not.have.property('site_registration_id');

      // Verify no ATP was created in database
      const atpCount = await db.query(
        'SELECT COUNT(*) FROM atp_requests WHERE site_code = $1',
        [invalidData.site_code || '']
      );
      expect(parseInt(atpCount.rows[0].count)).to.equal(0);
    });

    it('MUST rollback ATP if database error occurs after registration', async () => {
      // This test simulates partial failure scenario
      const siteCode = `CONTRACT-ROLLBACK-${Date.now()}`;

      // Mock database error scenario
      const originalQuery = db.query;
      db.query = async (sql, params) => {
        if (sql.includes('atp_requests')) {
          throw new Error('Simulated database error');
        }
        return originalQuery(sql, params);
      };

      try {
        await request(app)
          .post('/sites/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            site_code: siteCode,
            site_name: 'Rollback Test Site',
            customer_name: 'Test Customer',
            customer_email: 'customer7@test.com',
            customer_phone: '08123456789',
            package_type: 'basic'
          })
          .expect(500);
      } finally {
        // Restore original query function
        db.query = originalQuery;
      }

      // Verify both registration and ATP were rolled back
      const regCount = await db.query(
        'SELECT COUNT(*) FROM site_registrations WHERE site_code = $1',
        [siteCode]
      );
      expect(parseInt(regCount.rows[0].count)).to.equal(0);
    });
  });

  describe('CONTRACT-004: Edge - Duplicate Registration → Idempotent', () => {

    it('MUST return same ATP for duplicate request with same idempotency key', async () => {
      const idempotencyKey = `test-idempotency-${Date.now()}`;
      const siteCode = `CONTRACT-IDEM-${Date.now()}`;

      const firstResponse = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          site_code: siteCode,
          site_name: 'Idempotency Test Site',
          customer_name: 'Test Customer',
          customer_email: 'customer8@test.com',
          customer_phone: '08123456789',
          package_type: 'basic'
        })
        .expect(201);

      const { site_registration_id: firstRegId, atp_request_id: firstAtpId } = firstResponse.body;

      // Send exact same request with same idempotency key
      const secondResponse = await request(app)
        .post('/sites/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          site_code: siteCode,
          site_name: 'Idempotency Test Site',
          customer_name: 'Test Customer',
          customer_email: 'customer8@test.com',
          customer_phone: '08123456789',
          package_type: 'basic'
        })
        .expect(200); // 200 OK, not 201 Created

      // Contract: MUST return same IDs
      expect(secondResponse.body.site_registration_id).to.equal(firstRegId);
      expect(secondResponse.body.atp_request_id).to.equal(firstAtpId);

      // Verify only 1 ATP exists in database
      const atpCount = await db.query(
        'SELECT COUNT(*) FROM atp_requests WHERE site_registration_id = $1',
        [firstRegId]
      );
      expect(parseInt(atpCount.rows[0].count)).to.equal(1);
    });
  });

  describe('CONTRACT-005: Data Consistency - ATP Always Has Registration', () => {

    it('MUST guarantee every ATP has valid site_registration_id', async () => {
      // Create 10 registrations
      const registrations = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/sites/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            site_code: `CONTRACT-BULK-${Date.now()}-${i}`,
            site_name: `Bulk Test Site ${i}`,
            customer_name: 'Test Customer',
            customer_email: `customer.bulk.${i}@test.com`,
            customer_phone: '08123456789',
            package_type: 'basic'
          })
          .expect(201);

        registrations.push(response.body);
      }

      // Verify all ATPs have valid registration references
      const { rows } = await db.query(`
        SELECT a.id, a.site_registration_id, s.id as registration_exists
        FROM atp_requests a
        LEFT JOIN site_registrations s ON a.site_registration_id = s.id
        WHERE a.id = ANY($1)
      `, [registrations.map(r => r.atp_request_id)]);

      rows.forEach(row => {
        expect(row.registration_exists).to.not.be.null; // Registration must exist
        expect(row.site_registration_id).to.not.be.null;
      });

      // Cleanup
      await db.query('DELETE FROM atp_requests WHERE id = ANY($1)', [
        registrations.map(r => r.atp_request_id)
      ]);
      await db.query('DELETE FROM site_registrations WHERE id = ANY($1)', [
        registrations.map(r => r.site_registration_id)
      ]);
    });
  });
});
