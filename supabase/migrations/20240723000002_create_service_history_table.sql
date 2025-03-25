-- Create service_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS service_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  branch TEXT,
  start_date DATE,
  end_date DATE,
  job TEXT,
  deployments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own service history" ON service_history;
CREATE POLICY "Users can view their own service history"
  ON service_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own service history" ON service_history;
CREATE POLICY "Users can insert their own service history"
  ON service_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own service history" ON service_history;
CREATE POLICY "Users can update their own service history"
  ON service_history FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own service history" ON service_history;
CREATE POLICY "Users can delete their own service history"
  ON service_history FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
alter publication supabase_realtime add table service_history;
