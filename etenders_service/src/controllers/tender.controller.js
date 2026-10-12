import * as tenderService from '../services/tender.service.js';
import * as apiResponse from '../utils/apiResponse.js';

/**
 * GET /api/tenders
 * Supports filtering, sorting, and pagination via query string.
 */
export const getTenders = async (req, res, next) => {
  try {
    const { data, pagination } = await tenderService.queryTenders(req.query);

    return apiResponse.success(res, {
      message: 'Tenders retrieved successfully',
      data,
      pagination,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/tenders/:id
 * Accepts either the Mongo _id or the eTenders sourceId.
 */
export const getTenderById = async (req, res, next) => {
  try {
    const tender = await tenderService.getTenderById(req.params.id);

    if (!tender) {
      return apiResponse.error(res, {
        message: `Tender not found for id "${req.params.id}"`,
        statusCode: 404,
      });
    }

    return apiResponse.success(res, {
      message: 'Tender retrieved successfully',
      data: tender,
    });
  } catch (err) {
    return next(err);
  }
};
