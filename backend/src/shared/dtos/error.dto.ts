// Shapes error responses so the frontend receives a predictable error format.
function toErrorDto(error) {
  return {
    message: error.message || 'Something went wrong.',
  };
}

export { toErrorDto };
