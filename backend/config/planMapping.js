/**
 * Plan Mapping Configuration
 * Maps Paystack plan codes to internal plan tiers
 *
 * Environment variable format:
 * PLAN_CODE_MAPPING=PLN_code1:tier1,PLN_code2:tier2
 * Example: PLAN_CODE_MAPPING=PLN_m1ykgpo58lqzkqd:standard,PLN_starter_code:starter
 */

const VALID_TIERS = ['starter', 'basic', 'standard', 'professional', 'enterprise'];

/**
 * Parse plan code mapping from environment variable
 * @returns {Object} Mapping of plan codes to tiers
 */
const getPlanCodeMapping = () => {
  const mappingStr = process.env.PLAN_CODE_MAPPING || '';
  const mapping = {};

  if (!mappingStr.trim()) {
    // Default mapping if no env variable is set
    return {
      'PLN_m1ykgpo58lqzkqd': 'standard',
    };
  }

  // Parse the environment variable format: PLN_code1:tier1,PLN_code2:tier2
  const pairs = mappingStr.split(',');
  pairs.forEach((pair) => {
    const [code, tier] = pair.trim().split(':');
    if (code && tier && VALID_TIERS.includes(tier)) {
      mapping[code.trim()] = tier.trim();
    }
  });

  return mapping;
};

/**
 * Convert planId (plan code or tier) to a valid plan tier
 * @param {string} planId - The plan identifier (could be a plan code or tier)
 * @returns {string} Valid plan tier
 */
const getPlanTier = (planId) => {
  if (!planId) {
    return 'standard';
  }

  // If it's already a valid tier, return it
  if (VALID_TIERS.includes(planId)) {
    return planId;
  }

  // Try to map it from plan code
  const mapping = getPlanCodeMapping();
  return mapping[planId] || 'standard';
};

export { getPlanTier, getPlanCodeMapping, VALID_TIERS };
