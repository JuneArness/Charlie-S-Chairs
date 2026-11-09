-- Run in Supabase > SQL Editor AFTER creating Charles's login under Authentication > Users > Add user.
-- Replace the email with the login email. This gives that login access to admin.html.
insert into public.admins (user_id)
select id from auth.users where email = lower('parkscharles838@gmail.com')
on conflict do nothing;
select u.email from public.admins a join auth.users u on u.id = a.user_id;
