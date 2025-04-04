-- Add claim_type and diagnostic_code columns to conditions table
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS claim_type VARCHAR(50);
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS diagnostic_code VARCHAR(20);

-- Update existing records to have a default claim_type
UPDATE conditions SET claim_type = 'Primary' WHERE claim_type IS NULL;

-- Enable realtime for the conditions table
ALTER PUBLICATION supabase_realtime ADD TABLE conditions;
