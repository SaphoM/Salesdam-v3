/**
 * password-reset.e2e.mjs — password reset with tokens hashed at rest.
 *
 * Boots the real Express app, seeds a tenant/user, stores a reset token hash
 * the same way the controllers do, then exercises verify-reset-token and
 * reset-password with the raw token.
 *
 * Run: node tests/password-reset.e2e.mjs   (from backend/)
 * Exits non-zero if any check fails.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import app from '../app.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Session from '../models/Session.js';
import passwordResetService from '../services/passwordResetService.js';
import { seedDefaultRoles } from '../services/roleService.js';

const RUN = Date.now().toString(36);
const OLD_PASSWORD = 'OldPass123!';
const NEW_PASSWORD = 'NewPass123!';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

const post = async (path, body) => {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

let tenantId = null;
try {
  await connectDB();

  const tenant = await Tenant.create({
    name: `ZZ_RESET_${RUN}`,
    slug: `zz-reset-${RUN}`,
    status: 'active',
    plan: 'enterprise',
  });
  tenantId = tenant._id;
  await seedDefaultRoles(tenant._id);
  const role = await Role.findOne({ tenantId: tenant._id, name: 'admin' });

  const user = await User.create({
    tenantId: tenant._id,
    firstName: 'Reset',
    lastName: 'Tester',
    email: `reset-${RUN}@example.com`,
    username: `reset_${RUN}`,
    password: OLD_PASSWORD,
    role: role._id,
    status: 'active',
    emailVerified: true,
  });

  // Mimic the forgot-password write path: store only the hash, email the raw.
  const rawToken = passwordResetService.generateResetToken();
  user.passwordResetToken = passwordResetService.hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const stored = await User.findById(user._id).select('+passwordResetToken');
  check('reset token stored as a hash, not raw', stored.passwordResetToken !== rawToken, '');
  check(
    'stored value equals sha256(raw)',
    stored.passwordResetToken === passwordResetService.hashToken(rawToken),
  );

  const badVerify = await post('/api/v1/auth/verify-reset-token', { token: 'wrong-token' });
  check('wrong token rejected', badVerify.status === 400, `HTTP ${badVerify.status}`);

  const goodVerify = await post('/api/v1/auth/verify-reset-token', { token: rawToken });
  check('raw token verifies', goodVerify.status === 200, `HTTP ${goodVerify.status}`);

  const weak = await post('/api/v1/auth/reset-password', { token: rawToken, newPassword: 'weak' });
  check('weak password rejected by validator', weak.status === 400, `HTTP ${weak.status}`);

  const reset = await post('/api/v1/auth/reset-password', {
    token: rawToken,
    newPassword: NEW_PASSWORD,
  });
  check('raw token resets password', reset.status === 200, `HTTP ${reset.status}`);

  const reuse = await post('/api/v1/auth/reset-password', {
    token: rawToken,
    newPassword: 'OtherPass123!',
  });
  check('token cannot be reused after reset', reuse.status === 400, `HTTP ${reuse.status}`);

  const loginNew = await post('/api/v1/auth/login', {
    username: user.username,
    password: NEW_PASSWORD,
  });
  check('login works with new password', loginNew.status === 200, `HTTP ${loginNew.status}`);

  const loginOld = await post('/api/v1/auth/login', {
    username: user.username,
    password: OLD_PASSWORD,
  });
  check('login fails with old password', loginOld.status !== 200, `HTTP ${loginOld.status}`);
} catch (err) {
  check('test harness ran without error', false, err.message);
} finally {
  if (tenantId) {
    await Tenant.deleteMany({ _id: tenantId });
    await Promise.all(
      [User, Role, Session].map((M) => M.deleteMany({ tenantId }).catch(() => {})),
    );
  }
  server.close();
  await mongoose.connection.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
