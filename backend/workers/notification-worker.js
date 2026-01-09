require('dotenv').config();
const database = require('../database');
const { sendWhatsAppMessage, sendSuccessWhatsApp } = require('../services/whatsapp');
const { sendOrderConfirmationEmail, sendPaymentSuccessEmail } = require('../services/email');
const logger = require('../lib/logger');

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS = [60000, 300000, 900000, 1800000]; // 1m, 5m, 15m, 30m

async function processNotification(notification) {
  logger.info({
    notification_id: notification.id,
    template: notification.template_name,
    channel: notification.channel
  }, 'Processing notification');

  try {
    let data = notification.body_data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        logger.error({ notification_id: notification.id, error: e.message }, 'Failed to parse body_data');
      }
    }

    if (notification.template_name === 'order_confirmation') {
      if (notification.channel === 'EMAIL') {
        await sendOrderConfirmationEmail(data);
      } else if (notification.channel === 'WHATSAPP') {
        await sendWhatsAppMessage(data);
      }
    } else if (notification.template_name === 'payment_success') {
      if (notification.channel === 'EMAIL') {
        await sendPaymentSuccessEmail(data);
      } else if (notification.channel === 'WHATSAPP') {
        await sendSuccessWhatsApp(data);
      }
    }

    // Mark as sent
    await database.query(`
      UPDATE notification_outbox
      SET status = 'SENT', sent_at = NOW()
      WHERE id = $1
    `, [notification.id]);

    logger.info({ notification_id: notification.id }, 'Notification sent');

  } catch (error) {
    logger.error({ notification_id: notification.id, error: error.message }, 'Error in processNotification');
    const attemptCount = (notification.attempt_count || 0) + 1;

    if (attemptCount >= MAX_ATTEMPTS) {
      await database.query(`
        UPDATE notification_outbox
        SET status = 'DLQ', last_error = $2
        WHERE id = $1
      `, [notification.id, error.message]);
      logger.error({ notification_id: notification.id }, 'Moved to DLQ');
    } else {
      const nextRetry = new Date(Date.now() + RETRY_DELAYS[attemptCount - 1]);
      await database.query(`
        UPDATE notification_outbox
        SET status = 'RETRYING',
            attempt_count = $2,
            next_retry_at = $3,
            last_error = $4
        WHERE id = $1
      `, [notification.id, attemptCount, nextRetry, error.message]);
      logger.warn({ notification_id: notification.id, attempt: attemptCount }, 'Scheduled retry');
    }
  }
}

async function workerLoop() {
  logger.info('Starting notification worker...');

  while (true) {
    try {
      const result = await database.query(`
        SELECT * FROM notification_outbox
        WHERE status IN ('PENDING', 'RETRYING')
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at ASC
        LIMIT 10
      `);

      const notifications = result.rows;

      if (notifications.length > 0) {
        logger.info({ count: notifications.length }, 'Found notifications to process');
        for (const notification of notifications) {
          await processNotification(notification);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      logger.error({ error: error.message }, 'Worker loop error');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Start worker
if (true) { // Forced for PM2 reliability
  workerLoop().catch(err => {
    logger.error({ error: err.message }, 'Fatal worker error');
  });
}

module.exports = { workerLoop, processNotification };
