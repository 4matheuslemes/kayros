-- Add onboarding_completed column
alter table public.profiles
  add column onboarding_completed boolean not null default false;

-- Mark existing users who have changed defaults as having completed onboarding
update public.profiles 
set onboarding_completed = true 
where full_name != '' 
   or monthly_goal_hours != 50 
   or working_days <> '{1,2,3,4,5,6,7}';
