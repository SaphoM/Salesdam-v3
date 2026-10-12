const PLAN_LIMITS = {
  free: {
    maxUsers: 1,
    maxRecords: 1000,
    maxObjects: 25,
    maxAutomations: 2,
  },
  starter: {
    maxUsers: 1,
    maxRecords: 5000,
    maxObjects: 25,
    maxAutomations: 5,
  },
  basic: {
    maxUsers: 3,
    maxRecords: 10000,
    maxObjects: 25,
    maxAutomations: 10,
  },
  standard: {
    maxUsers: 10,
    maxRecords: 50000,
    maxObjects: 30,
    maxAutomations: 25,
  },
  professional: {
    maxUsers: 25,
    maxRecords: 100000,
    maxObjects: 50,
    maxAutomations: 50,
  },
  enterprise: {
    maxUsers: 20,
    maxRecords: 200000,
    maxObjects: 100,
    maxAutomations: 100,
  },
};

export default PLAN_LIMITS;
