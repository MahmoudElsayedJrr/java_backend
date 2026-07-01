const { HTTP_STATUS } = require('../constants');

/**
 * Send a success response
 */
const sendSuccess = (res, { data = null, message = 'Success', statusCode = HTTP_STATUS.OK, meta = null } = {}) => {
  const response = { success: true, message };
  if (data !== null)  response.data = data;
  if (meta !== null)  response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
const sendError = (res, { message = 'Something went wrong', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null } = {}) => {
  const response = { success: false, message };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

/**
 * Build pagination meta object
 */
const paginate = ({ page = 1, limit = 10, total }) => {
  const currentPage  = parseInt(page,  10);
  const perPage      = parseInt(limit, 10);
  const totalPages   = Math.ceil(total / perPage);

  return {
    total,
    page:       currentPage,
    limit:      perPage,
    totalPages,
    hasNext:    currentPage < totalPages,
    hasPrev:    currentPage > 1,
  };
};

module.exports = { sendSuccess, sendError, paginate };
