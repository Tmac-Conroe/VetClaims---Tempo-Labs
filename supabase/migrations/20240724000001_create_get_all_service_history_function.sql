-- Create a function to get all service history for the current user
CREATE OR REPLACE FUNCTION get_all_service_history()
RETURNS SETOF service_history AS $$
BEGIN
  -- Return all service history records for the authenticated user
  RETURN QUERY
  SELECT *
  FROM service_history
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on the function
GRANT EXECUTE ON FUNCTION get_all_service_history() TO authenticated;

-- Comment out as table is likely already in the publication
-- ALTER PUBLICATION supabase_realtime ADD TABLE service_history;
