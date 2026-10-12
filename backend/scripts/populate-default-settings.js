/**
 * Migration script to populate default company profile and invoice/quote settings
 * for existing tenants that don't have them
 * Usage: node scripts/populate-default-settings.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import logger from '../utils/logger.js';

const DB_URL = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!DB_URL) {
  console.error('ERROR: Database connection string not found.');
  process.exit(1);
}

const main = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(DB_URL);
    logger.info('✓ Connected to MongoDB\n');

    const tenants = await Tenant.find({});
    logger.info(`Found ${tenants.length} tenant(s)\n`);

    let updated = 0;

    for (const tenant of tenants) {
      const updates = {};

      // Check and populate company profile if missing
      if (
        !tenant.companyProfile ||
        !tenant.companyProfile.companyName ||
        !tenant.companyProfile.email
      ) {
        updates['companyProfile'] = {
          companyName:
            tenant.companyProfile?.companyName || tenant.name || '',
          namePrefix: tenant.companyProfile?.namePrefix || '',
          email: tenant.companyProfile?.email || tenant.ownerEmail || '',
          phone:
            tenant.companyProfile?.phone ||
            tenant.phone ||
            '',
          vatNumber: tenant.companyProfile?.vatNumber || '',
          description: tenant.companyProfile?.description || '',
          website: tenant.companyProfile?.website || '',
          address:
            tenant.companyProfile?.address || {
              street: '',
              city: '',
              province: '',
              zipCode: '',
              country: '',
            },
          financialYearStartMonth:
            tenant.companyProfile?.financialYearStartMonth || 1,
        };
      }

      // Check and populate invoice/quote settings if missing
      if (
        !tenant.invoiceQuoteSettings ||
        !tenant.invoiceQuoteSettings.companyName
      ) {
        updates['invoiceQuoteSettings'] = {
          companyName:
            tenant.invoiceQuoteSettings?.companyName || tenant.name || '',
          website: tenant.invoiceQuoteSettings?.website || '',
          emailAddress:
            tenant.invoiceQuoteSettings?.emailAddress ||
            tenant.ownerEmail ||
            '',
          phoneNumber:
            tenant.invoiceQuoteSettings?.phoneNumber || tenant.phone || '',
          companyLogo: tenant.invoiceQuoteSettings?.companyLogo || '',
          street: tenant.invoiceQuoteSettings?.street || '',
          city: tenant.invoiceQuoteSettings?.city || '',
          stateProvince: tenant.invoiceQuoteSettings?.stateProvince || '',
          zipPostalCode:
            tenant.invoiceQuoteSettings?.zipPostalCode || '',
          country: tenant.invoiceQuoteSettings?.country || '',
          bankName: tenant.invoiceQuoteSettings?.bankName || '',
          accountName: tenant.invoiceQuoteSettings?.accountName || '',
          accountNumber: tenant.invoiceQuoteSettings?.accountNumber || '',
          invoicePrefix:
            tenant.invoiceQuoteSettings?.invoicePrefix || 'INV',
          invoiceStartingNumber:
            tenant.invoiceQuoteSettings?.invoiceStartingNumber || 1,
          invoiceNumberingFormat:
            tenant.invoiceQuoteSettings?.invoiceNumberingFormat || '',
          defaultTaxRate:
            tenant.invoiceQuoteSettings?.defaultTaxRate || 0,
          quotePrefix:
            tenant.invoiceQuoteSettings?.quotePrefix || 'QUO',
          quoteStartingNumber:
            tenant.invoiceQuoteSettings?.quoteStartingNumber || 1,
          quoteValidityDays:
            tenant.invoiceQuoteSettings?.quoteValidityDays || 30,
          invoiceTerms:
            tenant.invoiceQuoteSettings?.invoiceTerms ||
            'Payment is due within 30 days of invoice date.',
          quoteTerms:
            tenant.invoiceQuoteSettings?.quoteTerms ||
            'This quote is valid for 30 days from the date issued.',
          paymentInstructions:
            tenant.invoiceQuoteSettings?.paymentInstructions ||
            'Please transfer payment to the bank account details provided below.',
          cancellationPolicy:
            tenant.invoiceQuoteSettings?.cancellationPolicy ||
            'Orders may be cancelled up to 7 days before delivery date.',
          invoiceFooter:
            tenant.invoiceQuoteSettings?.invoiceFooter ||
            'Thank you for your business!',
          showLogoOnDocuments:
            tenant.invoiceQuoteSettings?.showLogoOnDocuments !== undefined
              ? tenant.invoiceQuoteSettings.showLogoOnDocuments
              : true,
          showBankingDetailsOnInvoices:
            tenant.invoiceQuoteSettings?.showBankingDetailsOnInvoices !==
            undefined
              ? tenant.invoiceQuoteSettings.showBankingDetailsOnInvoices
              : true,
          showBankingDetailsOnQuotes:
            tenant.invoiceQuoteSettings?.showBankingDetailsOnQuotes !==
            undefined
              ? tenant.invoiceQuoteSettings.showBankingDetailsOnQuotes
              : false,
          showTaxBreakdown:
            tenant.invoiceQuoteSettings?.showTaxBreakdown !== undefined
              ? tenant.invoiceQuoteSettings.showTaxBreakdown
              : true,
          showDiscountField:
            tenant.invoiceQuoteSettings?.showDiscountField !== undefined
              ? tenant.invoiceQuoteSettings.showDiscountField
              : false,
        };
      }

      if (Object.keys(updates).length > 0) {
        await Tenant.findByIdAndUpdate(tenant._id, {
          $set: updates,
        });
        logger.info(`✓ ${tenant.name}: Settings populated`);
        updated++;
      } else {
        logger.info(`  ${tenant.name}: Already has default settings`);
      }
    }

    logger.info('\n' + '━'.repeat(50));
    logger.info('SUMMARY');
    logger.info('━'.repeat(50));
    logger.info(`✓ Updated ${updated}/${tenants.length} tenant(s)`);
    logger.info('✓ Company Profile: Name, Email, Phone, FY Start Month');
    logger.info('✓ Invoice Settings: Prefix, Starting Number, Tax Rate, Terms');
    logger.info('✓ Quote Settings: Prefix, Starting Number, Validity Days, Terms');
    logger.info('✓ Payment Instructions & Cancellation Policy');
    logger.info('✓ Invoice/Quote Display Options\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error:', error.message);
    process.exit(1);
  }
};

main();
