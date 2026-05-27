-- ===========================================================================
-- Manual migration: Row-Level Security, partial unique indexes, append-only
-- audit log. Apply AFTER the baseline Prisma migration that creates the tables.
--
--   psql "$DATABASE_URL" -f prisma/manual/0001_rls_and_constraints.sql
--
-- These constraints cannot be expressed in schema.prisma and are the database
-- backstop for tenant isolation (defence in depth) and BIR/soft-delete rules.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Partial unique indexes (uniqueness only among non-deleted rows)
--    Lets a slug/email/code be reused after the owning row is soft-deleted.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_slug_active
  ON tenants (slug) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_email_active
  ON users (tenant_id, email) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_tenant_code_active
  ON branches (tenant_id, code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_company_code_active
  ON departments (tenant_id, company_id, code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_tenant_name_active
  ON roles (tenant_id, name) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Row-Level Security for tenant isolation.
--
--    The application opens each request's transaction with:
--        SET LOCAL app.current_tenant = '<tenant uuid>';
--    Platform/super-admin operations set:
--        SET LOCAL app.bypass_rls = 'on';
--
--    Run the API under a NON-superuser, NON-BYPASSRLS role so these policies
--    are actually enforced (a superuser or table owner bypasses RLS).
-- ---------------------------------------------------------------------------

-- Helper expressions repeated per table:
--   USING ( tenant_id = current_setting('app.current_tenant', true)::uuid
--           OR current_setting('app.bypass_rls', true) = 'on' )

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'companies', 'branches', 'departments', 'users',
    'sessions', 'user_tokens', 'roles', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);

    EXECUTE format($p$
      DROP POLICY IF EXISTS tenant_isolation ON %I;
      CREATE POLICY tenant_isolation ON %I
        USING (
          current_setting('app.bypass_rls', true) = 'on'
          OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
        )
        WITH CHECK (
          current_setting('app.bypass_rls', true) = 'on'
          OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
        );
    $p$, t, t);
  END LOOP;
END $$;

-- role_permissions and user_roles have no tenant_id column; they are reachable
-- only via tenant-scoped parents (roles/users). If exposed directly, scope them
-- with a join-based policy in a later migration.

-- ---------------------------------------------------------------------------
-- 3. Append-only audit log: allow INSERT + SELECT, block UPDATE/DELETE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_logs_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();
