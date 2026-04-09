CREATE TABLE IF NOT EXISTS ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  prompt text,
  result text,
  model text DEFAULT 'claude-sonnet-4-20250514',
  tokens_used integer,
  duration_ms integer,
  status text DEFAULT 'success' CHECK (status IN ('success','error')),
  error_message text,
  created_by text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_action ON ai_logs(action);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at DESC);
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
