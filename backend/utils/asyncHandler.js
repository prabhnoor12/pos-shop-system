// utils/asyncHandler.js
// Utility to wrap async route handlers for Express

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
