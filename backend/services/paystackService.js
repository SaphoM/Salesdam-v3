import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const PAYSTACK_API_URL = 'https://api.paystack.co';

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!this.secretKey) {
      logger.warn('PAYSTACK_SECRET_KEY is not set');
    }
  }

  /**
   * Initialize Paystack payment
   */
  async initializePayment(email, amount, metadata = {}) {
    try {
      const response = await axios.post(
        `${PAYSTACK_API_URL}/transaction/initialize`,
        {
          email,
          amount: Math.round(amount * 100), // Convert to cents
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack initialization error:', error.message);
      throw error;
    }
  }

  /**
   * Verify Paystack transaction
   */
  async verifyTransaction(reference) {
    try {
      const response = await axios.get(
        `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (response.data.status && response.data.data.status === 'success') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        status: response.data.data?.status || 'unknown',
        message: 'Transaction verification failed',
      };
    } catch (error) {
      logger.error('Paystack verification error:', error.message);
      throw error;
    }
  }

  /**
   * Create subscription plan
   */
  async createPlan(name, amount, interval = 'monthly') {
    try {
      const response = await axios.post(
        `${PAYSTACK_API_URL}/plan`,
        {
          name,
          amount: Math.round(amount * 100),
          interval,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack plan creation error:', error.message);
      throw error;
    }
  }

  /**
   * Get list of plans
   */
  async getPlans() {
    try {
      const response = await axios.get(`${PAYSTACK_API_URL}/plan`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack fetch plans error:', error.message);
      throw error;
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(customerId, planCode, authorizationCode) {
    try {
      const response = await axios.post(
        `${PAYSTACK_API_URL}/subscription`,
        {
          customer: customerId,
          plan: planCode,
          authorization: authorizationCode,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack subscription creation error:', error.message);
      throw error;
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(reference) {
    try {
      const response = await axios.post(
        `${PAYSTACK_API_URL}/refund`,
        {
          transaction: reference,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack refund error:', error.message);
      throw error;
    }
  }

  /**
   * Disable subscription
   */
  async disableSubscription(subscriptionCode, token = null) {
    try {
      const response = await axios.post(
        `${PAYSTACK_API_URL}/subscription/${subscriptionCode}/disable`,
        token ? { token } : {},
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack disable subscription error:', error.message);
      throw error;
    }
  }

  /**
   * Get customer details by customer code
   */
  async getCustomer(customerCode) {
    try {
      const response = await axios.get(
        `${PAYSTACK_API_URL}/customer/${customerCode}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack get customer error:', error.message);
      throw error;
    }
  }

  /**
   * Get customer transactions
   */
  async getCustomerTransactions(customerId, limit = 50, page = 1) {
    try {
      const response = await axios.get(`${PAYSTACK_API_URL}/transaction`, {
        params: {
          customer: customerId,
          limit,
          page,
        },
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack get transactions error:', error.message);
      throw error;
    }
  }

  /**
   * Update customer authorization (card)
   */
  async updateCustomerAuthorization(customerId, authorizationCode, token) {
    try {
      const response = await axios.post(
        `${PAYSTACK_API_URL}/customer/${customerId}/set_default_authorization`,
        {
          authorization: authorizationCode,
          token,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack update authorization error:', error.message);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionCode) {
    try {
      const response = await axios.get(
        `${PAYSTACK_API_URL}/subscription/${subscriptionCode}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack get subscription error:', error.message);
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscriptionPlan(subscriptionCode, planCode) {
    try {
      const response = await axios.post(
        `${PAYSTACK_API_URL}/subscription/${subscriptionCode}/manage/plan`,
        {
          plan: planCode,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Paystack update subscription plan error:', error.message);
      throw error;
    }
  }

  /**
   * Verify webhook signature using timing-safe comparison
   */
  verifyWebhookSignature(signature, body) {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(body))
      .digest('hex');

    // Use timing-safe comparison to prevent length/oracle attacks
    const hmacBuffer = Buffer.from(hash, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    // Ensure both buffers are the same length before comparison
    if (hmacBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hmacBuffer, signatureBuffer);
  }
}

export default new PaystackService();
