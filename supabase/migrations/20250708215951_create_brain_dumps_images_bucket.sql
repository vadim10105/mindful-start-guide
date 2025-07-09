create extension if not exists "uuid-ossp";

insert into storage.buckets (id, name, public)
values ('brain-dumps-images', 'brain-dumps-images', true);

-- Optional: Add a policy to allow anonymous users to upload files
-- This is needed if you want users to upload images without being logged in
create policy "Allow anonymous uploads" on storage.objects for insert with check (bucket_id = 'brain-dumps-images');

-- Optional: Add a policy to allow anonymous users to view files
create policy "Allow anonymous reads" on storage.objects for select using (bucket_id = 'brain-dumps-images');