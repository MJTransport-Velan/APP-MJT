-- Edit/Delete across the Finance module.
--
-- Every Finance screen now offers Edit and Delete, which needed permissions
-- that did not exist before: deletes for the banking entities (which only
-- ever had create/edit), edits for the records that could previously only be
-- created and deleted (bank transfers, petty cash requests, salary
-- structures, capital transactions).
--
-- The seed creates and grants these idempotently for a fresh database; this
-- migration does the same for one that is already live.

INSERT INTO "permissions" ("id", "name", "description")
SELECT gen_random_uuid(), v."name", v."description"
FROM (VALUES
  ('bankAccount.delete', 'Delete a Bank Account (only one never used by a transaction)'),
  ('cashAccount.delete', 'Delete a Cash Account (only one never used by a transaction)'),
  ('bankTransfer.edit', 'Edit a Bank Transfer (re-posts the money it moved)'),
  ('bankTransfer.delete', 'Delete a Bank Transfer (puts the money back)'),
  ('chequeBook.delete', 'Delete an unused Cheque Book'),
  ('cheque.delete', 'Delete a Cheque that never cleared or bounced'),
  ('pettyCashRequest.edit', 'Edit a pending Petty Cash Request'),
  ('pettyCashRequest.delete', 'Delete a Petty Cash Request that never disbursed'),
  ('supplierBill.delete', 'Delete a Supplier Bill with no payments or notes against it'),
  ('capital_transaction.edit', 'Correct a Capital Transaction (re-posts its fund movement)'),
  ('driverSettlement.delete', 'Delete an unpaid Driver Settlement'),
  ('driverSalaryStructure.edit', 'Edit a Driver Salary Structure'),
  ('salaryStructure.edit', 'Edit a Salary Structure')
) AS v("name", "description")
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."name" = v."name");

-- SUPER_ADMIN holds every permission by definition.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'SUPER_ADMIN'
  AND p."name" IN (
    'bankAccount.delete', 'cashAccount.delete', 'bankTransfer.edit', 'bankTransfer.delete',
    'chequeBook.delete', 'cheque.delete', 'pettyCashRequest.edit', 'pettyCashRequest.delete',
    'supplierBill.delete', 'capital_transaction.edit', 'driverSettlement.delete',
    'driverSalaryStructure.edit', 'salaryStructure.edit'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Finance sign-off roles get edit and delete both.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ACCOUNTING_MANAGER', 'FINANCE_MANAGER')
  AND p."name" IN (
    'bankAccount.delete', 'cashAccount.delete', 'bankTransfer.edit', 'bankTransfer.delete',
    'chequeBook.delete', 'cheque.delete', 'pettyCashRequest.edit', 'pettyCashRequest.delete',
    'supplierBill.delete', 'capital_transaction.edit', 'driverSettlement.delete',
    'driverSalaryStructure.edit', 'salaryStructure.edit'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Day-to-day operators correct their own entries but do not delete records
-- that other documents may already be reading — same split the module used
-- before for create vs approve.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'ACCOUNTS_EXECUTIVE'
  AND p."name" IN ('bankTransfer.edit', 'chequeBook.edit', 'pettyCashRequest.edit', 'capital_transaction.edit')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
