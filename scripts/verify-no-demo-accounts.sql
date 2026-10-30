-- ==============================================================================
-- Read-Only Production Verification Script
-- Target Database: Production Neon PostgreSQL Branch
-- Purpose: Verify that legacy seed demo accounts (9999999999, 9876543210) do NOT
--          exist in the active production database, and inspect active faculty counts.
-- CAUTION: This script performs SELECT queries only. No data is modified.
-- ==============================================================================

-- 1. Check for presence of legacy default seeded phone numbers.
-- Expected output: 0 rows returned.
SELECT 
    id,
    role,
    phone,
    "isActive",
    "createdAt"
FROM "users"
WHERE phone IN ('9999999999', '9876543210');

-- 2. User account distribution by role.
-- Verifies total number of active institutional accounts in production.
SELECT 
    role,
    "isActive",
    COUNT(*) AS total_count
FROM "users"
GROUP BY role, "isActive"
ORDER BY role;

-- 3. List active faculty logins (phone numbers and roles) for institutional audit.
SELECT 
    id,
    role,
    phone,
    email,
    "failedLoginAttempts",
    "lockedUntil",
    "lastLoginAt",
    "createdAt"
FROM "users"
WHERE role IN ('ADMIN', 'TEACHER')
ORDER BY role, "createdAt" ASC;
