-- داده‌ی نمونه برای گالری مدل‌های آماده
-- تصاویر واقعی را در باکت عمومی 'models' در Supabase Storage آپلود کنید.
insert into public.preset_models (id, title, gender, hijab, thumbnail_path, image_path, sort_order) values
  ('female-01', 'خانم — استودیویی',      'female', false, 'models/female-01-thumb.jpg', 'models/female-01.jpg', 1),
  ('female-hijab-01', 'خانم با حجاب',        'female', true,  'models/female-hijab-01-thumb.jpg', 'models/female-hijab-01.jpg', 2),
  ('male-01', 'آقا — رسمی',              'male',   false, 'models/male-01-thumb.jpg', 'models/male-01.jpg', 3),
  ('neutral-01', 'مانکن خنثی',           'neutral',false, 'models/neutral-01-thumb.jpg', 'models/neutral-01.jpg', 4)
on conflict (id) do nothing;
