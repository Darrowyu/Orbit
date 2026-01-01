---
name: postgresql-table-design
description: Design a PostgreSQL-specific schema. Covers best-practices, data types, indexing, constraints, performance patterns, and advanced features.
---

## PostgreSQL Table Design

Comprehensive guide for designing PostgreSQL schemas with best practices.

### When to Use This Skill

- Designing new database schemas
- Optimizing existing table structures
- Implementing indexing strategies
- Setting up constraints and relationships
- Performance tuning for PostgreSQL

### Data Type Selection

#### Numeric Types
```sql
-- Integers
smallint      -- -32768 to +32767
integer       -- -2147483648 to +2147483647
bigint        -- -9223372036854775808 to +9223372036854775807
serial        -- auto-incrementing integer
bigserial     -- auto-incrementing bigint

-- Decimals
numeric(p,s)  -- exact, variable precision
decimal(p,s)  -- same as numeric
real          -- 6 decimal digits precision
double precision -- 15 decimal digits precision
money         -- currency amount
```

#### Text Types
```sql
char(n)       -- fixed-length, padded
varchar(n)    -- variable-length with limit
text          -- variable unlimited length
```

#### Date/Time Types
```sql
timestamp     -- date and time (no timezone)
timestamptz   -- date and time with timezone (RECOMMENDED)
date          -- date only
time          -- time only
interval      -- time span
```

#### JSON Types
```sql
json          -- text storage, parsed on access
jsonb         -- binary storage, indexed, RECOMMENDED
```

### Schema Design Patterns

#### Standard Table Structure
```sql
CREATE TABLE entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- or: id bigserial PRIMARY KEY,
    
    -- Business columns
    name varchar(255) NOT NULL,
    description text,
    status varchar(50) NOT NULL DEFAULT 'active',
    
    -- Metadata
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz, -- soft delete
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'pending'))
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

#### Multi-Tenant Pattern
```sql
-- Tenant isolation with RLS
CREATE TABLE tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE tenant_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    data jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenant_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenant_data
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Indexing Strategies

```sql
-- B-tree (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- Partial index (for filtered queries)
CREATE INDEX idx_active_users ON users(email) WHERE deleted_at IS NULL;

-- Composite index (column order matters)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

-- GIN for JSONB
CREATE INDEX idx_data_jsonb ON documents USING GIN(data);

-- GIN for full-text search
CREATE INDEX idx_search ON articles USING GIN(to_tsvector('english', content));

-- Expression index
CREATE INDEX idx_lower_email ON users(LOWER(email));
```

### Performance Best Practices

1. **Use appropriate data types** - Don't use bigint when int suffices
2. **Add indexes for WHERE, JOIN, ORDER BY columns**
3. **Use partial indexes** for frequently filtered subsets
4. **Analyze query plans** with `EXPLAIN ANALYZE`
5. **Partition large tables** by date or tenant
6. **Use connection pooling** (PgBouncer)
7. **Set appropriate work_mem** for complex queries
8. **Regular VACUUM and ANALYZE**

### Common Patterns for This Project

```sql
-- KPI Assessment Score Table
CREATE TABLE assessment_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_period_id uuid NOT NULL REFERENCES assessment_periods(id),
    employee_id uuid NOT NULL REFERENCES employees(id),
    kpi_id uuid NOT NULL REFERENCES kpis(id),
    target_value numeric(10,2),
    actual_value numeric(10,2),
    score numeric(5,2),
    weight numeric(3,2) DEFAULT 1.00,
    calculated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(assessment_period_id, employee_id, kpi_id)
);

CREATE INDEX idx_scores_period ON assessment_scores(assessment_period_id);
CREATE INDEX idx_scores_employee ON assessment_scores(employee_id);
```
