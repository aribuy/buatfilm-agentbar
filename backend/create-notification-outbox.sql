-- Create notification_outbox table for async notification processing
CREATE TABLE IF NOT EXISTS notification_outbox (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'EMAIL' or 'WHATSAPP'
  body_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RETRYING, SENT, DLQ
  attempt_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  last_error TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on status for faster querying
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON notification_outbox(status);

-- Create index on next_retry_at for worker polling
CREATE INDEX IF NOT EXISTS idx_notification_outbox_next_retry ON notification_outbox(next_retry_at);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_notification_outbox_created ON notification_outbox(created_at);

COMMENT ON TABLE notification_outbox IS 'Outbox pattern for async notification processing with retry logic';
