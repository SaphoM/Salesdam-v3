/**
 * Insurance pricing engine — the single authoritative premium calculator (BRD §9.5).
 *
 * Website, branch and telephone journeys must all call this. It reads the
 * effective-dated Product Version / Benefit Cover / Child Benefit Rule metadata
 * records and returns a premium breakdown. It NEVER substitutes a default
 * premium: a missing rate is an explicit configuration error (BRD §9.5).
 *
 * The pure core (`computePremium`) takes plain config objects so it can be unit
 * tested without a database; `loadPricingConfig` fetches the metadata records
 * (tenant-scoped) and feeds the core.
 */
import DynamicRecord from '../../models/DynamicRecord.js';

/** Raised when configured product/rate data is missing or invalid. HTTP 422. */
export class InsuranceConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InsuranceConfigError';
    this.isOperational = true;
    this.statusCode = 422;
    this.isConfigError = true;
  }
}

export const RATE_CATEGORIES = {
  MAIN_ONLY: 'main_member_only',
  MAIN_SPOUSE: 'main_member_spouse',
  MAIN_CHILDREN: 'main_member_children',
  MAIN_SPOUSE_CHILDREN: 'main_member_spouse_children',
  EXTENDED_FAMILY: 'extended_family',
};

/** Map a DynamicRecord (or lean doc) `data` Map/object to a plain object. */
export const dataOf = (rec) => {
  const d = rec?.data;
  if (!d) return {};
  if (typeof d.get === 'function') {
    const out = {};
    for (const [k, v] of d) out[k] = v;
    return out;
  }
  return d;
};

const asNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const inAgeBand = (age, min, max) => {
  const lo = asNumber(min);
  const hi = asNumber(max);
  if (lo !== null && age < lo) return false;
  if (hi !== null && age > hi) return false;
  return true;
};

const effectiveOn = (rec, onDate) => {
  const from = rec.effective_from ? new Date(rec.effective_from) : null;
  const to = rec.effective_to ? new Date(rec.effective_to) : null;
  if (from && from > onDate) return false;
  if (to && to < onDate) return false;
  return true;
};

/** Which main package rate category applies to the insured lives provided. */
export const resolveRateCategory = ({ hasSpouse, hasChildren }) => {
  if (hasSpouse && hasChildren) return RATE_CATEGORIES.MAIN_SPOUSE_CHILDREN;
  if (hasSpouse) return RATE_CATEGORIES.MAIN_SPOUSE;
  if (hasChildren) return RATE_CATEGORIES.MAIN_CHILDREN;
  return RATE_CATEGORIES.MAIN_ONLY;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Authoritative premium calculation (pure).
 *
 * @param {object} opts
 * @param {object}   opts.productVersion  Product Version data object
 * @param {object[]} opts.benefitCovers   Benefit Cover data objects for the version
 * @param {object[]} opts.childRules      Child Benefit Rule data objects for the version
 * @param {object[]} opts.members         [{ relation, age, cover_amount? }]
 * @param {number}   opts.mainCoverAmount Selected full cover amount for the package
 * @param {Date}     [opts.asOfDate]      Effective date for rate selection (default now)
 * @param {boolean}  [opts.manualOverride] Tenant-permitted override flag
 * @param {number}   [opts.overridePremium]
 * @returns {object} premium breakdown
 */
export const computePremium = ({
  productVersion,
  benefitCovers = [],
  childRules = [],
  members = [],
  mainCoverAmount,
  asOfDate = new Date(),
  manualOverride = false,
  overridePremium = null,
}) => {
  if (!productVersion) {
    throw new InsuranceConfigError('Product Version is required to price an application.');
  }
  if (productVersion.status && productVersion.status !== 'active') {
    throw new InsuranceConfigError(
      `Product Version is not active (status: ${productVersion.status}).`,
    );
  }
  if (!effectiveOn(productVersion, asOfDate)) {
    throw new InsuranceConfigError('Product Version is not effective on the pricing date.');
  }

  const mains = members.filter((m) => m.relation === 'main_member');
  if (mains.length !== 1) {
    throw new InsuranceConfigError('Exactly one Main Member is required to price an application.');
  }
  const main = mains[0];
  const mainAge = asNumber(main.age);
  if (mainAge === null) throw new InsuranceConfigError('Main Member age is required.');

  const minEntry = asNumber(productVersion.min_entry_age);
  const maxEntry = asNumber(productVersion.max_entry_age);
  if (minEntry !== null && mainAge < minEntry) {
    throw new InsuranceConfigError(`Main Member age ${mainAge} is below the minimum entry age ${minEntry}.`);
  }
  if (maxEntry !== null && mainAge > maxEntry) {
    throw new InsuranceConfigError(`Main Member age ${mainAge} exceeds the maximum entry age ${maxEntry}.`);
  }

  const spouses = members.filter((m) => m.relation === 'spouse');
  const children = members.filter((m) => m.relation === 'child');
  const extended = members.filter((m) => m.relation === 'extended_family');

  if (spouses.length && productVersion.allow_spouse === false) {
    throw new InsuranceConfigError('This Product Version does not permit a spouse.');
  }
  if (children.length && productVersion.allow_children === false) {
    throw new InsuranceConfigError('This Product Version does not permit children.');
  }
  if (extended.length && productVersion.allow_extended_family === false) {
    throw new InsuranceConfigError('This Product Version does not permit extended family.');
  }

  const limit = (value, max, label) => {
    const cap = asNumber(max);
    if (cap !== null && value > cap) {
      throw new InsuranceConfigError(`${label} limit exceeded (max ${cap}, got ${value}).`);
    }
  };
  limit(spouses.length, productVersion.max_spouses, 'Spouse');
  limit(children.length, productVersion.max_children, 'Children');
  limit(extended.length, productVersion.max_extended_family, 'Extended family');

  const rateCategory = resolveRateCategory({
    hasSpouse: spouses.length > 0,
    hasChildren: children.length > 0,
  });
  const coverAmount = asNumber(mainCoverAmount);
  if (coverAmount === null) {
    throw new InsuranceConfigError('A main cover amount is required.');
  }

  const effectiveCovers = benefitCovers.filter((c) => effectiveOn(c, asOfDate));

  const findCover = (category, amount, age, who) => {
    const match = effectiveCovers.find(
      (c) =>
        c.rate_category === category &&
        asNumber(c.cover_amount) === amount &&
        inAgeBand(age, c.min_age, c.max_age),
    );
    if (!match) {
      throw new InsuranceConfigError(
        `No configured rate for ${who}: category "${category}", cover ${amount}` +
          `${age !== null ? `, age ${age}` : ''}. ` +
          'Configure a Benefit Cover for this Product Version.',
      );
    }
    return match;
  };

  const packageCover = findCover(rateCategory, coverAmount, mainAge, 'main package');
  const mainPremium = asNumber(packageCover.premium);
  if (mainPremium === null) {
    throw new InsuranceConfigError('The matched Benefit Cover has no customer premium configured.');
  }
  const underwriterRate = asNumber(packageCover.underwriter_rate);
  const markup = asNumber(packageCover.markup);

  // Child cover amounts are derived: % of main cover, capped per age band (BRD §9.4).
  const effectiveChildRules = childRules.filter((r) => effectiveOn(r, asOfDate));
  const childBreakdown = children.map((child) => {
    const age = asNumber(child.age);
    if (age === null) throw new InsuranceConfigError('Child age is required.');
    const rule = effectiveChildRules.find((r) => inAgeBand(age, r.min_age, r.max_age));
    if (!rule) {
      throw new InsuranceConfigError(`No Child Benefit Rule configured for child age ${age}.`);
    }
    const pct = asNumber(rule.percent_of_main_cover);
    const cap = asNumber(rule.max_child_cover);
    let childCover = pct !== null ? (pct / 100) * coverAmount : null;
    if (childCover === null) {
      throw new InsuranceConfigError('Child Benefit Rule is missing "% of Main Cover".');
    }
    if (cap !== null) childCover = Math.min(childCover, cap);
    return { age, cover_amount: round2(childCover) };
  });

  // Extended family lives are separately priced Benefit Cover records (BRD §7.1).
  const extendedBreakdown = extended.map((member) => {
    const age = asNumber(member.age);
    if (age === null) throw new InsuranceConfigError('Extended family member age is required.');
    const memberCover = asNumber(member.cover_amount);
    if (memberCover === null) {
      throw new InsuranceConfigError('Extended family members require their own cover amount.');
    }
    const cover = findCover(RATE_CATEGORIES.EXTENDED_FAMILY, memberCover, age, 'extended family');
    const prem = asNumber(cover.premium);
    if (prem === null) {
      throw new InsuranceConfigError('The matched extended-family Benefit Cover has no premium.');
    }
    return {
      age,
      cover_amount: memberCover,
      premium: prem,
      underwriter_rate: asNumber(cover.underwriter_rate),
      markup: asNumber(cover.markup),
    };
  });

  const extendedPremium = extendedBreakdown.reduce((s, e) => s + e.premium, 0);
  const extendedUnderwriter = extendedBreakdown.reduce((s, e) => s + (e.underwriter_rate || 0), 0);
  const extendedMarkup = extendedBreakdown.reduce((s, e) => s + (e.markup || 0), 0);

  // Manual override — off by default, tenant-product gated (BRD §9.5).
  let override = false;
  let totalPremium = mainPremium + extendedPremium;
  if (manualOverride) {
    if (productVersion.allows_manual_premium_override !== true) {
      throw new InsuranceConfigError('Manual premium overrides are not permitted for this Product Version.');
    }
    const over = asNumber(overridePremium);
    if (over === null) throw new InsuranceConfigError('A manual override requires an override premium amount.');
    totalPremium = over;
    override = true;
  }

  return {
    rate_category: rateCategory,
    effective_date: asOfDate.toISOString().slice(0, 10),
    main: {
      cover_amount: coverAmount,
      premium: mainPremium,
      underwriter_rate: underwriterRate,
      markup,
      waiting_period_months: asNumber(packageCover.waiting_period_months),
    },
    children: childBreakdown,
    extended_family: extendedBreakdown,
    totals: {
      premium: round2(totalPremium),
      underwriter_rate: round2((underwriterRate || 0) + extendedUnderwriter),
      markup: round2((markup || 0) + extendedMarkup),
      billable_premium: round2(totalPremium),
    },
    manual_override: override,
  };
};

/** Load the tenant-scoped config records for a Product Version. */
export const loadPricingConfig = async ({ tenantId, productVersionId, asOfDate = new Date() }) => {
  const pv = await DynamicRecord.findOne({
    _id: productVersionId,
    tenantId,
    objectApiName: 'product_version',
    isDeleted: false,
  });
  if (!pv) throw new InsuranceConfigError('Product Version not found.');

  // shortcut: benefit covers / child rules are filtered in JS by lookup id so we
  // don't depend on how the Mixed lookup value was stored (string vs ObjectId).
  // Fine for per-version config sets; move to indexed lookups if volumes grow.
  const [covers, rules] = await Promise.all([
    DynamicRecord.find({ tenantId, objectApiName: 'benefit_cover', isDeleted: false }),
    DynamicRecord.find({ tenantId, objectApiName: 'child_benefit_rule', isDeleted: false }),
  ]);

  const pvId = String(productVersionId);
  return {
    productVersion: { _id: pv._id, ...dataOf(pv) },
    benefitCovers: covers
      .filter((c) => String(dataOf(c).product_version) === pvId)
      .map(dataOf),
    childRules: rules
      .filter((r) => String(dataOf(r).product_version) === pvId)
      .map(dataOf),
  };
};

/** Convenience: load config then compute. */
export const priceApplication = async ({
  tenantId,
  productVersionId,
  members,
  mainCoverAmount,
  asOfDate,
  manualOverride,
  overridePremium,
}) => {
  const cfg = await loadPricingConfig({ tenantId, productVersionId, asOfDate });
  return computePremium({ ...cfg, members, mainCoverAmount, asOfDate, manualOverride, overridePremium });
};

export default { computePremium, loadPricingConfig, priceApplication, resolveRateCategory, InsuranceConfigError };
