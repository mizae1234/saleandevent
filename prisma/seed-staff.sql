-- Seed Staff Data (PC พนักงาน)
INSERT INTO staff (id, name, role, phone, payment_type, daily_rate, status, created_at, updated_at)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'สมศรี อารมณ์ดี', 'PC', '081-111-1111', 'daily', 500.00, 'active', NOW(), NOW()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'สมหญิง รักงาน', 'PC', '081-222-2222', 'daily', 500.00, 'active', NOW(), NOW()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'สมศักดิ์ ขยัน', 'PC', '081-333-3333', 'daily', 500.00, 'active', NOW(), NOW()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'สมชาย ใจดี', 'PC', '081-444-4444', 'daily', 500.00, 'active', NOW(), NOW()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'สมปอง เก่งมาก', 'PC', '081-555-5555', 'daily', 450.00, 'active', NOW(), NOW()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'สมใจ รักเรียน', 'PC', '081-666-6666', 'commission', NULL, 'active', NOW(), NOW()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'สมพร สุดสวย', 'PC', '081-777-7777', 'daily', 500.00, 'active', NOW(), NOW()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567808', 'สมบุญ มากมี', 'PC', '081-888-8888', 'daily', 500.00, 'active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  payment_type = EXCLUDED.payment_type,
  daily_rate = EXCLUDED.daily_rate,
  updated_at = NOW();
