const CircuitBreaker = require('opossum');
const logger = require('./logger');

const midtransOptions = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10
};

module.exports = (operation, options = {}) => {
  const opts = { ...midtransOptions, ...options };
  const breaker = new CircuitBreaker(operation, opts);

  breaker.on('open', () => {
    logger.error({ circuit: 'OPEN' }, 'Circuit breaker opened');
  });

  breaker.on('halfOpen', () => {
    logger.warn({ circuit: 'HALF_OPEN' }, 'Circuit breaker half-open');
  });

  breaker.on('close', () => {
    logger.info({ circuit: 'CLOSED' }, 'Circuit breaker closed');
  });

  breaker.fallback((error) => {
    logger.error({ error: error.message }, 'Circuit breaker fallback triggered');
    return {
      error: 'Service temporarily unavailable',
      queued: true
    };
  });

  return breaker;
};
