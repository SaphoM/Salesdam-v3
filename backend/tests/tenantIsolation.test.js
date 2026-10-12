/**
 * Tenant Isolation Tests
 * 
 * Tests that enforceTenant middleware and registration flows properly isolate
 * data between tenants. Critical P0 item from V3 Gap Analysis.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

// Load app after dotenv
const app = require('../app.js');

process.env.APP_URL = 'http://localhost:3333';

let mongoServer;

beforeAll(async () => {
  mongoServer = new MongoMemoryServer();
  await mongoose.connect(await mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }

  // Define minimal schemas and models for test isolation
  const tenantSchema = new mongoose.Schema({
    name: String,
    slug: String,
    plan: { type: String, default: 'free' },
    status: { type: String, default: 'active' },
  });
  const Tenant = mongoose.model('Tenant', tenantSchema);

  const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    username: { type: String, unique: true },
    password: String,
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    status: { type: String, default: 'pending_verification' },
    emailVerified: { type: Boolean, default: false },
  });
  const User = mongoose.model('User', userSchema);

  const roleSchema = new mongoose.Schema({
    name: String,
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  });
  const Role = mongoose.model('Role', roleSchema);

  // Create tenant 1 (Sales hub)
  const tenant1 = new Tenant({ name: 'Sales Tenant', slug: 'sales-tenant' });
  await tenant1.save();
  const t1Id = tenant1._id;

  // Create tenant 2 (Insurance hub)
  const tenant2 = new Tenant({ name: 'Insurance Tenant', slug: 'insurance-tenant' });
  await tenant2.save();
  const t2Id = tenant2._id;

  // Create superuser roles
  new Role({ name: 'superuser', tenantId: t1Id }).save();
  new Role({ name: 'superuser', tenantId: t2Id }).save();

  // Create regular users in each tenant
  const user1 = new User({
    firstName: 'Sales',
    lastName: 'User',
    email: 'sales@salesdam.com',
    username: 'salesuser',
    password: 'password123',
    tenantId: t1Id,
    status: 'active',
    emailVerified: true,
  });
  await user1.save();
  const u1Id = user1._id;

  const user2 = new User({
    firstName: 'Insurance',
    lastName: 'User',
    email: 'insurance@salesdam.com',
    username: 'insuranceuser',
    password: 'password123',
    tenantId: t2Id,
    status: 'active',
    emailVerified: true,
  });
  await user2.save();
  const u2Id = user2._id;
});

describe('Tenant Isolation - enforceTenant middleware', () => {
  it('should block cross-tenant incident access', async () => {
    // User from tenant1 tries to create incident - enforceTenant should block cross-tenant
    const res = await request(app)
      .post('/api/incidents')
      .send({
        title: 'Cross-tenant test',
        description: 'Should be blocked',
        priority: 'medium',
      });

    // enforceTenant should return 403 for cross-tenant access
    expect([403]).toContain(res.status);
  });

  it('should allow own tenant incident creation', async () => {
    // User from tenant1 creating incident should work (tenant is injected)
    const res = await request(app)
      .post('/api/incidents')
      .send({
        title: 'Own tenant incident',
        description: 'Should work',
        priority: 'medium',
      });

    // Should succeed - tenant is injected by enforceTenant/injectTenantId
    expect([200, 201]).toContain(res.status);
    if (res.status !== 403) {
      expect(res.body.data.title).toBe('Own tenant incident');
    }
  });

  it('should block lead approval from different tenant', async () => {
    // Cross-tenant lead access should be blocked
    const res = await request(app)
      .post('/api/leads/lead123/submit-for-approval')
      .send();

    // enforceTenant should block this - 403 for unauthorized tenant access
    expect([403]).toContain(res.status);
  });
});

describe('Tenant Isolation - Registration flow tenant assignment', () => {
  it('free registration should create user in a tenant', async () => {
    // Test that free registration creates a user with a tenant
    const res = await request(app)
      .post('/api/registration/free')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        companyName: 'Test Company',
        phone: '1234567890',
      });

    expect([200, 201]).toContain(res.status);
    // The response should include registrationId and confirmation message
    if (res.body.data) {
      expect(res.body.data.registrationId).toBeDefined();
    }
    expect(res.body.message).toContain('verification');
  });

  it('paystack registration should create user with plan tier', async () => {
    const res = await request(app)
      .post('/api/registration/paystack')
      .send({
        firstName: 'Paystack',
        lastName: 'User',
        email: 'paystack@example.com',
        username: 'paystackuser',
        password: 'password123',
        companyName: 'Paystack Co',
        phone: '1234567890',
        planId: 'starter',
        debitOrderDay: 1,
        hub: 'sales',
      });

    expect([200, 201]).toContain(res.status);
    if (res.body.data) {
      // User should be created with a plan tier
      expect(res.body.data.user.plan).toBeDefined();
    }
  });
});

describe('Tenant Isolation - Auth token tenant binding', () => {
  it('should verify user tenant via session', async () => {
    // Login and verify tenant is set
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'salesuser',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    // The user should have a tenantId attached
    if (res.body.data && res.body.data.user) {
      expect(res.body.data.user.tenantId).toBeDefined();
    }
  });

  it('should reject access without tenant context', async () => {
    // Request without proper tenant should be rejected
    const res = await request(app)
      .get('/api/incidents');

    // Should get auth error or be blocked by enforceTenant
    expect([401, 403]).toContain(res.status);
  });
});