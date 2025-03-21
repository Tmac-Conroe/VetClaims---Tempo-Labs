-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Public insert access" ON "public"."users";
DROP POLICY IF EXISTS "Public select access" ON "public"."users";

-- Enable RLS on users table
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Public insert access"
ON "public"."users"
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public select access"
ON "public"."users"
FOR SELECT
USING (true);

-- Enable realtime
alter publication supabase_realtime add table users;
