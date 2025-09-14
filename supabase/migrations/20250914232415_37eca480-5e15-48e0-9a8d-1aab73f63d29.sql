-- Fix function security by setting search_path
CREATE OR REPLACE FUNCTION public.check_subscription_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions 
  SET status = 'expired'
  WHERE status = 'active' 
  AND end_date < now();
END;
$$;