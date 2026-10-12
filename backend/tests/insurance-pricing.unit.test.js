/**
 * Unit tests for the authoritative insurance pricing engine (BRD §9).
 * Pure functions — no database required.
 */
import { computePremium, resolveRateCategory, InsuranceConfigError } from '../services/insurance/pricingService.js';

const pv = (over = {}) => ({
  status: 'active',
  effective_from: '2026-01-01',
  allow_spouse: true,
  allow_children: true,
  allow_extended_family: true,
  max_spouses: 1,
  max_children: 5,
  max_extended_family: 3,
  min_entry_age: 18,
  max_entry_age: 65,
  allows_manual_premium_override: false,
  ...over,
});

const cover = (over = {}) => ({
  rate_category: 'main_member_only',
  cover_amount: 100000,
  min_age: 18,
  max_age: 65,
  premium: 250,
  underwriter_rate: 200,
  markup: 50,
  waiting_period_months: 6,
  effective_from: '2026-01-01',
  ...over,
});

const childRule = (over = {}) => ({
  min_age: 0,
  max_age: 21,
  percent_of_main_cover: 50,
  max_child_cover: 20000,
  effective_from: '2026-01-01',
  ...over,
});

const price = (opts) =>
  computePremium({
    productVersion: pv(),
    benefitCovers: [cover()],
    childRules: [childRule()],
    members: [{ relation: 'main_member', age: 30 }],
    mainCoverAmount: 100000,
    ...opts,
  });

describe('resolveRateCategory', () => {
  it('selects the category from spouse/children presence', () => {
    expect(resolveRateCategory({ hasSpouse: false, hasChildren: false })).toBe('main_member_only');
    expect(resolveRateCategory({ hasSpouse: true, hasChildren: false })).toBe('main_member_spouse');
    expect(resolveRateCategory({ hasSpouse: false, hasChildren: true })).toBe('main_member_children');
    expect(resolveRateCategory({ hasSpouse: true, hasChildren: true })).toBe('main_member_spouse_children');
  });
});

describe('computePremium', () => {
  it('prices a main-member-only package from the matched benefit cover', () => {
    const r = price();
    expect(r.rate_category).toBe('main_member_only');
    expect(r.totals.premium).toBe(250);
    expect(r.totals.underwriter_rate).toBe(200);
    expect(r.totals.markup).toBe(50);
    expect(r.main.waiting_period_months).toBe(6);
  });

  it('selects the rate category that matches the members', () => {
    const r = price({
      benefitCovers: [cover({ rate_category: 'main_member_spouse_children', premium: 420 })],
      members: [
        { relation: 'main_member', age: 30 },
        { relation: 'spouse', age: 29 },
        { relation: 'child', age: 5 },
      ],
    });
    expect(r.rate_category).toBe('main_member_spouse_children');
    expect(r.totals.premium).toBe(420);
  });

  it('honours age bands when several covers exist for the same category/amount', () => {
    const r = price({
      benefitCovers: [
        cover({ min_age: 18, max_age: 40, premium: 250 }),
        cover({ min_age: 41, max_age: 65, premium: 400 }),
      ],
      members: [{ relation: 'main_member', age: 50 }],
    });
    expect(r.main.premium).toBe(400);
  });

  it('derives child cover as % of main cover, capped by the age band maximum', () => {
    const r = price({
      benefitCovers: [cover({ rate_category: 'main_member_children', premium: 300 })],
      members: [
        { relation: 'main_member', age: 30 },
        { relation: 'child', age: 5 },
      ],
    });
    expect(r.children).toEqual([{ age: 5, cover_amount: 20000 }]); // min(50% of 100k, 20k)
    expect(r.totals.premium).toBe(300); // children are in the package premium
  });

  it('prices extended family separately and adds to the total', () => {
    const r = price({
      members: [
        { relation: 'main_member', age: 30 },
        { relation: 'extended_family', age: 60, cover_amount: 50000 },
      ],
      benefitCovers: [
        cover(),
        cover({ rate_category: 'extended_family', cover_amount: 50000, min_age: 18, max_age: 65, premium: 150, underwriter_rate: 120, markup: 30 }),
      ],
    });
    expect(r.extended_family).toHaveLength(1);
    expect(r.totals.premium).toBe(400); // 250 + 150
    expect(r.totals.underwriter_rate).toBe(320);
  });

  it('throws (no silent default) when no rate is configured for the requested cover', () => {
    expect(() => price({ benefitCovers: [cover({ cover_amount: 250000 })] })).toThrow(InsuranceConfigError);
  });

  it('throws when the main member age is outside the entry-age limits', () => {
    expect(() => price({ members: [{ relation: 'main_member', age: 16 }] })).toThrow(/below the minimum entry age/);
    expect(() => price({ members: [{ relation: 'main_member', age: 70 }] })).toThrow(/exceeds the maximum entry age/);
  });

  it('enforces product-version member limits', () => {
    expect(() =>
      price({
        productVersion: pv({ max_children: 1, allow_children: true }),
        benefitCovers: [cover({ rate_category: 'main_member_children' })],
        members: [
          { relation: 'main_member', age: 30 },
          { relation: 'child', age: 5 },
          { relation: 'child', age: 7 },
        ],
      }),
    ).toThrow(/Children limit exceeded/);
  });

  it('rejects members the product version does not permit', () => {
    expect(() =>
      price({
        productVersion: pv({ allow_spouse: false }),
        members: [
          { relation: 'main_member', age: 30 },
          { relation: 'spouse', age: 30 },
        ],
      }),
    ).toThrow(/does not permit a spouse/);
  });

  it('rejects a product version that is not effective on the pricing date', () => {
    expect(() =>
      price({ productVersion: pv({ effective_from: '2030-01-01' }) }),
    ).toThrow(/not effective/);
  });

  it('requires an explicit override permission', () => {
    expect(() => price({ manualOverride: true, overridePremium: 999 })).toThrow(/overrides are not permitted/);
    const r = price({
      productVersion: pv({ allows_manual_premium_override: true }),
      manualOverride: true,
      overridePremium: 999,
    });
    expect(r.totals.premium).toBe(999);
    expect(r.manual_override).toBe(true);
  });
});
