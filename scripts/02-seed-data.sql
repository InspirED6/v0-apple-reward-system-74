-- Insert admin user
INSERT INTO users (name, email, password, role, barcode, apples)
VALUES ('Admin User', 'admin@school.com', 'admin123', 'admin', '2001', 0)
ON CONFLICT (email) DO NOTHING;

-- Insert assistant users
INSERT INTO users (name, email, password, role, barcode, apples)
VALUES 
  ('Assistant One', 'assistant@school.com', 'assist123', 'assistant', '3001', 0),
  ('Assistant Two', 'assistant2@school.com', 'assist123', 'assistant', '3002', 0)
ON CONFLICT (email) DO NOTHING;

-- Insert sample students
INSERT INTO students (name, barcode, apples)
VALUES 
  ('Student One', '1001', 0),
  ('Student Two', '1002', 0),
  ('Student Three', '1003', 0)
ON CONFLICT (barcode) DO NOTHING;
