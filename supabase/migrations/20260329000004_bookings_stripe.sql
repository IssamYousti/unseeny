-- Add Stripe session tracking to bookings
alter table public.bookings
  add column if not exists stripe_session_id text unique;
