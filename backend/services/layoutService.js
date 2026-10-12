import Layout from '../models/Layout.js';
import ObjectMeta from '../models/ObjectMeta.js';

/**
 * Seed default layouts for Salesdam Deal and Order objects
 * Based on the approved layout requirements document
 */
const seedSalesdamLayouts = async (tenantId, userId) => {
  // Get or create Deal object
  let dealObj = await ObjectMeta.findOne({
    tenantId,
    apiName: 'deal',
  });

  if (!dealObj) {
    dealObj = await ObjectMeta.create({
      tenantId,
      name: 'Deal',
      label: 'Deal',
      pluralLabel: 'Deals',
      apiName: 'deal',
      icon: 'TrendingUp',
      color: '#10b981',
      isCustom: false,
      showInNav: true,
      navOrder: 35,
      nameFieldApiName: 'name',
      createdBy: userId,
    });
  }

  // Get or create Order object
  let orderObj = await ObjectMeta.findOne({
    tenantId,
    apiName: 'order',
  });

  if (!orderObj) {
    orderObj = await ObjectMeta.create({
      tenantId,
      name: 'Order',
      label: 'Order',
      pluralLabel: 'Orders',
      apiName: 'order',
      icon: 'Package',
      color: '#3b82f6',
      isCustom: false,
      showInNav: true,
      navOrder: 45,
      nameFieldApiName: 'name',
      createdBy: userId,
    });
  }

  // Create Deal default layout
  const dealLayout = await Layout.findOne({
    tenantId,
    objectApiName: 'deal',
    isDefault: true,
  });

  if (!dealLayout) {
    await Layout.create({
      tenantId,
      objectId: dealObj._id,
      objectApiName: 'deal',
      name: 'Default Deal Layout',
      description: 'Default layout for Deal records - Salesdam CRM',
      isDefault: true,
      type: 'detail',
      createdBy: userId,
      sections: [
        {
          id: 'deal_overview',
          label: 'Deal Overview',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'name', label: 'Deal Name', colspan: 1 },
                { fieldApiName: 'record_type', label: 'Record Type', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'stage', label: 'Stage', colspan: 1 },
                { fieldApiName: 'currency', label: 'Currency', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'closing_date', label: 'Closing Date', colspan: 1 },
                { fieldApiName: 'sales_rep', label: 'Sales Rep', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'industry', label: 'Industry', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'client_contact',
          label: 'Client & Contact',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'client', label: 'Client', colspan: 1 },
                { fieldApiName: 'title', label: 'Title', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'first_name', label: 'First Name', colspan: 1 },
                { fieldApiName: 'last_name', label: 'Last Name', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'email', label: 'Email', colspan: 1 },
                { fieldApiName: 'phone', label: 'Phone', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'website', label: 'Website', colspan: 1 },
                { fieldApiName: 'end_user', label: 'End User', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'scope_description',
          label: 'Scope & Description',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'technical_scope', label: 'Technical Scope', colspan: 2 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'product_name', label: 'Product Name', colspan: 1 },
                { fieldApiName: 'product_type', label: 'Product Type', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'product_description', label: 'Product Description', colspan: 2 },
              ],
            },
          ],
        },
        {
          id: 'commercial',
          label: 'Commercial',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'order_value', label: 'Selling Price (R)', colspan: 1 },
                { fieldApiName: 'purchase_price', label: 'Purchase Price (R)', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'quote_validity', label: 'Quote Validity Period', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'tender_information',
          label: 'Tender Information',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'rfq_number', label: 'RFQ Number', colspan: 1 },
                { fieldApiName: 'project_code', label: 'Project Code', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'cidb_number', label: 'CIDB Number', colspan: 1 },
                { fieldApiName: 'quote_validity', label: 'Quote Validity Period', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'quote_submission_location', label: 'Quote Submission Location', colspan: 1 },
                { fieldApiName: 'compulsory_briefing', label: 'Compulsory Briefing?', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'briefing_date_time', label: 'Date / Time of Briefing', colspan: 1 },
                { fieldApiName: 'briefing_address', label: 'Briefing Address', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'internal_comments',
          label: 'Internal Comments',
          columns: 1,
          collapsible: true,
          columnData: [
            {
              fields: [
                {
                  fieldApiName: 'internal_comments',
                  label: 'Internal Comments',
                  colspan: 2,
                },
              ],
            },
          ],
        },
      ],
    });
  }

  // Create Order default layout
  const orderLayout = await Layout.findOne({
    tenantId,
    objectApiName: 'order',
    isDefault: true,
  });

  if (!orderLayout) {
    await Layout.create({
      tenantId,
      objectId: orderObj._id,
      objectApiName: 'order',
      name: 'Default Order Layout',
      description: 'Default layout for Order records - Salesdam CRM',
      isDefault: true,
      type: 'detail',
      createdBy: userId,
      sections: [
        {
          id: 'order_overview',
          label: 'Order Overview',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'name', label: 'Order Name', colspan: 1 },
                { fieldApiName: 'order_number', label: 'Order Number', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'order_date', label: 'Order Date', colspan: 1 },
                { fieldApiName: 'delivery_date', label: 'Delivery Date', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'project_code', label: 'Project Code', colspan: 1 },
                { fieldApiName: 'product_name', label: 'Product Name', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'project_manager', label: 'Project Manager', colspan: 1 },
                { fieldApiName: 'sales_rep', label: 'Sales Rep', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'client', label: 'Client', colspan: 1 },
                { fieldApiName: 'contact', label: 'Contact', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'end_user', label: 'End User', colspan: 1 },
                { fieldApiName: 'vat_number', label: 'VAT Number', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'purchase_information',
          label: 'Purchase Information',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'invoice_number', label: 'Invoice Number', colspan: 1 },
                { fieldApiName: 'invoice_date', label: 'Invoice Date', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'delivery_note_number', label: 'Delivery Note Number', colspan: 1 },
                { fieldApiName: 'delivery_date', label: 'Delivery Date', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'payment_terms', label: 'Payment Terms', colspan: 1 },
                { fieldApiName: 'payment_date', label: 'Payment Date', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'financial',
          label: 'Financial',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'order_value', label: 'Selling Price (R)', colspan: 1 },
                { fieldApiName: 'budget_purchase_amount', label: 'Budget Cost (R)', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'actual_purchase_amount', label: 'Actual Cost (R)', colspan: 1 },
                { fieldApiName: 'commission', label: 'Commission', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'location_address',
          label: 'Location / Address',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'street', label: 'Street', colspan: 1 },
                { fieldApiName: 'city', label: 'City', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'province', label: 'Province', colspan: 1 },
                { fieldApiName: 'zip', label: 'Zip', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'country', label: 'Country', colspan: 2 },
                ],
            },
          ],
        },
      ],
    });
  }

  // Get or create Lead object
  let leadObj = await ObjectMeta.findOne({
    tenantId,
    apiName: 'lead',
  });

  if (!leadObj) {
    leadObj = await ObjectMeta.create({
      tenantId,
      name: 'Lead',
      label: 'Lead',
      pluralLabel: 'Leads',
      apiName: 'lead',
      icon: 'UserPlus',
      color: '#f59e0b',
      isCustom: false,
      showInNav: true,
      navOrder: 30,
      nameFieldApiName: 'name',
      createdBy: userId,
    });
  }

  // Create Lead default layout
  const leadLayout = await Layout.findOne({
    tenantId,
    objectApiName: 'lead',
    isDefault: true,
  });

  if (!leadLayout) {
    await Layout.create({
      tenantId,
      objectId: leadObj._id,
      objectApiName: 'lead',
      name: 'Default Lead Layout',
      description: 'Default layout for Lead records - Salesdam CRM',
      isDefault: true,
      type: 'detail',
      createdBy: userId,
      sections: [
        {
          id: 'lead_information',
          label: 'Lead Information',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'first_name', label: 'First Name', colspan: 1 },
                { fieldApiName: 'last_name', label: 'Last Name', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'sales_rep', label: 'Sales Rep', colspan: 1 },
                { fieldApiName: 'lead_source', label: 'Lead Source', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'email', label: 'Email', colspan: 1 },
                { fieldApiName: 'status', label: 'Lead Status', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'phone', label: 'Phone', colspan: 1 },
                { fieldApiName: 'rating', label: 'Rating', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'job_title', label: 'Job Title', colspan: 1 },
                { fieldApiName: 'assigned_approver', label: 'Assigned Approver', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'client', label: 'Client', colspan: 1 },
                { fieldApiName: 'approval_status', label: 'Approval Status', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'company_information',
          label: 'Company Information',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'industry', label: 'Industry', colspan: 1 },
                { fieldApiName: 'website', label: 'Website', colspan: 1 },
              ],
            },
          ],
        },
        {
          id: 'address',
          label: 'Address',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'street', label: 'Street', colspan: 1 },
                { fieldApiName: 'city', label: 'City', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'province', label: 'Province', colspan: 1 },
                { fieldApiName: 'zip', label: 'Zip', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'country', label: 'Country', colspan: 2 },
              ],
            },
          ],
        },
        {
          id: 'tender_details',
          label: 'Tender Details',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'rfq_number', label: 'RFQ Number', colspan: 1 },
                { fieldApiName: 'closing_date', label: 'Closing Date', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'cidb_number', label: 'CIDB Number', colspan: 1 },
                { fieldApiName: 'quote_validity_period', label: 'Quote Validity Period', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'quote_submission_location', label: 'Quote Submission Location', colspan: 2 },
              ],
            },
          ],
        },
        {
          id: 'product_details',
          label: 'Product Details',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'product_type', label: 'Product Type', colspan: 1 },
                { fieldApiName: 'end_user', label: 'End User', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'product_name', label: 'Product Name', colspan: 2 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'technical_scope', label: 'Technical Scope', colspan: 2 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'product_description', label: 'Product Description', colspan: 2 },
              ],
            },
          ],
        },
        {
          id: 'briefing',
          label: 'Briefing',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'compulsory_briefing', label: 'Compulsory Briefing', colspan: 1 },
                { fieldApiName: 'briefing_date_time', label: 'Date/Time of Briefing', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'briefing_address', label: 'Briefing Address', colspan: 2 },
              ],
            },
          ],
        },
      ],
    });
  }

  // Get or create Product object
  let productObj = await ObjectMeta.findOne({
    tenantId,
    apiName: 'product',
  });

  if (!productObj) {
    productObj = await ObjectMeta.create({
      tenantId,
      name: 'Product',
      label: 'Product',
      pluralLabel: 'Products',
      apiName: 'product',
      icon: 'Package',
      color: '#8b5cf6',
      isCustom: false,
      showInNav: true,
      navOrder: 55,
      nameFieldApiName: 'name',
      createdBy: userId,
    });
  }

  // Create Product default layout
  const productLayout = await Layout.findOne({
    tenantId,
    objectApiName: 'product',
    isDefault: true,
  });

  if (!productLayout) {
    await Layout.create({
      tenantId,
      objectId: productObj._id,
      objectApiName: 'product',
      name: 'Default Product Layout',
      description: 'Default layout for Product records - Salesdam CRM',
      isDefault: true,
      type: 'detail',
      createdBy: userId,
      sections: [
        {
          id: 'product_information',
          label: 'Product Information',
          columns: 2,
          collapsible: true,
          columnData: [
            {
              fields: [
                { fieldApiName: 'name', label: 'Product Name', colspan: 1 },
                { fieldApiName: 'sku', label: 'SKU', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'price', label: 'Unit Price', colspan: 1 },
                { fieldApiName: 'quantity_on_hand', label: 'Quantity on Hand', colspan: 1 },
              ],
            },
            {
              fields: [
                { fieldApiName: 'description', label: 'Description', colspan: 2 },
              ],
            },
          ],
        },
      ],
    });
  }

  return { dealObj, orderObj, leadObj, productObj };
};

export { seedSalesdamLayouts };
