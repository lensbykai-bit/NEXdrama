MOVIEFLIX WEBSITE V3 — ADMIN LOGIN + DATABASE
============================================

អ្វីដែលមានក្នុង Version 3
- Home / Movies / Series / Latest Episodes
- Search + Genre Filter
- Movie/Series Detail
- Episode & Video Player (MP4 / YouTube / Vimeo / embed URL)
- Admin Dashboard
- Admin Login ដោយ Supabase Auth
- Database កណ្តាលសម្រាប់ Movies / Series / Episodes / Brand
- Row Level Security (RLS): Public អាចមើល, Admin ប៉ុណ្ណោះអាច Add/Edit/Delete
- Demo Mode: បើមិនទាន់ភ្ជាប់ Database អាចបើកសាកបានភ្លាម

ឯកសារសំខាន់ៗ
- index.html = Website
- admin.html = Admin Dashboard / Login
- config.js = ដាក់ Supabase Project URL + Publishable Key
- setup.sql = SQL សម្រាប់បង្កើត Database tables + RLS

របៀបភ្ជាប់ Database
1) បង្កើត Supabase Project ថ្មី/ដាច់ដោយឡែកសម្រាប់ Movie Website។
2) ចូល SQL Editor ហើយ Run file: setup.sql
3) ចូល Project Settings / API ហើយយក៖
   - Project URL
   - Publishable Key
4) បើក config.js ហើយដាក់តម្លៃ៖

window.MOVIEFLIX_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  publishableKey: 'YOUR_PUBLISHABLE_KEY'
};

សំខាន់៖ កុំដាក់ service_role key ឬ secret key ក្នុង config.js។

បង្កើត Admin ដំបូង
1) បន្ទាប់ពីភ្ជាប់ config.js រួច បើក admin.html
2) ចុច “Create first account” ហើយបង្កើត Email/Password
3) បើ Supabase ទាមទារ Email confirmation សូម confirm email
4) នៅ SQL Editor ប្រើ command ខាងក្រោម (ប្តូរ Email របស់អ្នក):

insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
on conflict (user_id) do nothing;

5) បន្ទាប់មក Login ក្នុង admin.html។

របៀបប្រើ
- Add New Title = បន្ថែម Movie/Series
- Episodes = បន្ថែមភាគ និង Video URL
- Featured = ជ្រើសរឿងបង្ហាញ Hero នៅ Home
- Brand & Database = ប្តូរឈ្មោះ Website
- Export Backup = រក្សាទុក JSON backup

សុវត្ថិភាព/សិទ្ធិមាតិកា
ប្រើតែ Poster និង Video ដែលអ្នកជាម្ចាស់ ឬមានសិទ្ធិអនុញ្ញាតឱ្យផ្សព្វផ្សាយ។

សម្រាប់សាកដោយមិនមាន Database
ទុក config.js ឱ្យទទេ។ Website នឹងដំណើរការ Demo Mode ហើយទិន្នន័យត្រូវបានរក្សាទុកតែក្នុង browser នោះប៉ុណ្ណោះ។
