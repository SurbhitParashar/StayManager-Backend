-- =========================
-- USERS
-- =========================
INSERT INTO users (email, password_hash)
VALUES 
('jones@gmail.com', '$2b$10$XyIduroaZgtzHVQ/DtCl4erF/4H6c.s17F7LuSikrcQS6pnAFvZPS');


-- =========================
-- PROPERTIES (all 5 ENUM values)
-- =========================
INSERT INTO properties (property_name) VALUES
('Heron Marsh - Short term rentals'),
('Avian Forest - Short term rentals'),
('Montreat - Short term rentals'),
('Sequoyah Square - Long term rentals'),
('Washington Pike - Long term rentals');


-- =========================
-- CUSTOMERS (5 samples)
-- =========================
INSERT INTO customers (name, email, phone) VALUES
('Alice Smith', 'alice@gmail.com', '9876500001'),
('Bob Johnson', 'bob@gmail.com', '9876500002'),
('Charlie Brown', 'charlie@gmail.com', '9876500003'),
('David Wilson', 'david@gmail.com', '9876500004'),
('Emma Davis', 'emma@gmail.com', '9876500005');


-- =========================
-- BOOKINGS (5 samples)
-- =========================
INSERT INTO bookings 
(customer_id, property_id, platform, start_date, end_date, total_amount, payment_mode, status)
VALUES
(1, 1, 'airbnb', '2026-05-01', '2026-05-05', 500.00, 'online transaction', 'booked'),
(2, 2, 'vrbo', '2026-06-10', '2026-06-15', 750.00, 'online transaction', 'booked'),
(3, 3, 'others', '2026-07-01', '2026-07-03', 300.00, 'cash transaction', 'booked'),
(4, 4, 'airbnb', '2026-08-12', '2026-08-20', 1200.00, 'online transaction', 'booked'),
(5, 5, 'vrbo', '2026-09-05', '2026-09-10', 900.00, 'cash transaction', 'booked');