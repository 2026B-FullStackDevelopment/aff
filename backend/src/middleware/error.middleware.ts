// Converts thrown backend errors into consistent HTTP JSON responses.
const { toErrorDto } = require('../shared/dtos/error.dto');

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json(toErrorDto(error));
}

module.exports = { errorMiddleware };
