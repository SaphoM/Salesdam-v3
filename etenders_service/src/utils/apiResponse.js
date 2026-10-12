export const success = (res, { message = 'OK', data = null, pagination = null, statusCode = 200 } = {}) => {
  const body = { success: true, message };
  if (pagination) body.pagination = pagination;
  body.data = data;
  return res.status(statusCode).json(body);
};

export const error = (res, { message = 'Something went wrong', statusCode = 400 } = {}) =>
  res.status(statusCode).json({ success: false, message });
