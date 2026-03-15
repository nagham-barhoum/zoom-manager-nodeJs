/**
 * asyncHandler — بيلف أي async route بيمنع تكرار try/catch  
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next); 

// Singleton instance
module.exports = asyncHandler;