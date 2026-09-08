ALTER TABLE users CHANGE COLUMN email username VARCHAR(150) NOT NULL, DROP COLUMN age, DROP COLUMN address, DROP COLUMN phone_number;
ALTER TABLE account_registration_requests CHANGE COLUMN email username VARCHAR(150) NOT NULL, DROP COLUMN phone_number;
ALTER TABLE audit_logs CHANGE COLUMN user_email user_username VARCHAR(150) NOT NULL;
