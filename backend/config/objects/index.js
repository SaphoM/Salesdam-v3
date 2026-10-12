import { leadObject } from './lead.js';
import { dealObject } from './deal.js';
import { orderObject } from './order.js';
import { productObject } from './product.js';
import { contactObject } from './contact.js';
import { clientObject } from './client.js';
import { accountObject } from './account.js';
import { dealLineItemObject } from './dealLineItem.js';
import { orderLineItemObject } from './orderLineItem.js';
import { taskObject } from './task.js';
import { caseObject } from './case.js';
import { supportDocumentObject } from './supportDocument.js';
import { quoteObject } from './quote.js';
import { invoiceObject } from './invoice.js';

export const SALESDAM_OBJECTS = [
  leadObject,
  dealObject,
  orderObject,
  productObject,
  contactObject,
  clientObject,
  accountObject,
  dealLineItemObject,
  orderLineItemObject,
  quoteObject,
  invoiceObject,
  taskObject,
  caseObject,
  supportDocumentObject,
];

export default SALESDAM_OBJECTS;
