-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create corrected policies without recursion
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" 
ON profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create a separate admin policy that doesn't cause recursion
-- This policy allows users to view/manage all profiles if they have admin role
-- We'll use a function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get the user's role directly without causing recursion
  SELECT role INTO user_role 
  FROM profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  RETURN user_role = 'admin';
END;
$$;

-- Admin policy using the function
CREATE POLICY "Admins can manage all profiles" 
ON profiles 
FOR ALL 
USING (is_admin());

-- Also add INSERT policy for profile creation
CREATE POLICY "Users can create own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);