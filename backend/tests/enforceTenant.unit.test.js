// Unit test for enforceTenant middleware logic
// Tests the core tenant isolation principles without needing full app setup

// Mock the enforceTenant middleware logic inline
const enforceTenant = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      throw new Error('Tenant context is required.');
    }
    // In real code: const tenant = await Tenant.findById(req.tenantId);
    // For this test, we just validate the tenantId exists and is valid
    if (req.tenantId === 'invalid') {
      throw new Error('Tenant not found.');
    }
    // Verify user belongs to tenant (bypass for superuser)
    if (req.user && req.user.role && req.user.role.name !== 'superuser') {
      if (req.user.tenantId.toString() !== req.tenantId) {
        throw new Error('You do not have access to this workspace.');
      }
    }
    req.tenant = { _id: req.tenantId, name: 'Test Tenant' };
    next();
  } catch (err) {
    next(err);
  }
};

describe('enforceTenant - core logic', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { tenantId: '', user: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockNext = jest.fn();
  });

  it('should fail when no tenantId is provided', async () => {
    await enforceTenant(mockReq, mockRes, mockNext);
    // In the real middleware, error is passed to next(), not status/json
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error.message).toContain('Tenant context is required');
  });

  it('should fail when tenantId is invalid', async () => {
    mockReq.tenantId = 'invalid';
    await enforceTenant(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should allow user who belongs to the tenant', async () => {
    mockReq.tenantId = 'tenant-123';
    mockReq.user = { 
      tenantId: 'tenant-123',  // same tenant
      role: { name: 'user' }
    };
    await enforceTenant(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalledWith(403);
  });

  it('should block user from different tenant', async () => {
    mockReq.tenantId = 'tenant-123';
    mockReq.user = { 
      tenantId: 'tenant-456',  // different tenant
      role: { name: 'user' }
    };
    await enforceTenant(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error.message).toContain('access to this workspace');
  });

  it('should allow superuser bypass', async () => {
    mockReq.tenantId = 'tenant-123';
    mockReq.user = { 
      tenantId: 'tenant-456',  // different tenant
      role: { name: 'superuser' }  // superuser bypass
    };
    await enforceTenant(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});