-- Public bucket for item images (read-only to the world; writes admin-only).
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy item_images_public_read on storage.objects
  for select using (bucket_id = 'item-images');

create policy item_images_admin_write on storage.objects
  for insert with check (bucket_id = 'item-images' and public.is_admin());

create policy item_images_admin_update on storage.objects
  for update using (bucket_id = 'item-images' and public.is_admin());

create policy item_images_admin_delete on storage.objects
  for delete using (bucket_id = 'item-images' and public.is_admin());
