const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({
      error: 'Database Constraint Error',
      message: 'Resource already exists'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validateOrder = (req, res, next) => {
  const { orderId, amount, email, phone, name } = req.body;
  
  const errors = [];
  
  if (!orderId) errors.push('Order ID is required');
  if (!amount || amount <= 0) errors.push('Valid amount is required');
  if (!email || !/\S+@\S+\.\S+/.test(email)) errors.push('Valid email is required');
  if (!phone) errors.push('Phone number is required');
  if (!name) errors.push('Name is required');
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors
    });
  }
  
  next();
};

module.exports = { errorHandler, asyncHandler, validateOrder };