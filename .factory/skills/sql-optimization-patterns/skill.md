---
name: sql-optimization-patterns
description: Master SQL query optimization, indexing strategies, and EXPLAIN analysis to dramatically improve database performance and eliminate slow queries. Use when debugging slow queries, designing database schemas, or optimizing application performance.
---

## SQL Optimization Patterns

Comprehensive guide for optimizing SQL queries and database performance.

### When to Use This Skill

- Debugging slow queries
- Analyzing query execution plans
- Designing efficient indexes
- Optimizing JOIN operations
- Reducing database load

### EXPLAIN Analysis

```sql
-- Basic explain
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';

-- With execution statistics
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Full output format
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM users WHERE email = 'test@example.com';
```

#### Key Metrics to Watch
- **Seq Scan** - Full table scan (often bad)
- **Index Scan** - Using index (good)
- **Rows** - Estimated vs actual rows
- **Cost** - Relative execution cost
- **Buffers** - Memory/disk access

### Index Optimization

#### When to Add Indexes
```sql
-- Columns in WHERE clauses
CREATE INDEX idx_users_email ON users(email);

-- Columns in JOIN conditions
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Columns in ORDER BY
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Composite for multi-column queries
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);
```

#### When NOT to Index
- Small tables (< 1000 rows)
- Columns with low cardinality
- Frequently updated columns
- Columns rarely used in queries

### Query Optimization Patterns

#### Pattern 1: Avoid SELECT *
```sql
-- Bad
SELECT * FROM employees WHERE department_id = 1;

-- Good
SELECT id, name, email FROM employees WHERE department_id = 1;
```

#### Pattern 2: Use EXISTS instead of IN
```sql
-- Slower (for large subqueries)
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);

-- Faster
SELECT * FROM users u WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

#### Pattern 3: Batch Operations
```sql
-- Bad: N+1 queries
FOR each user_id:
  SELECT * FROM orders WHERE user_id = ?

-- Good: Single query
SELECT * FROM orders WHERE user_id IN (1, 2, 3, ...);
```

#### Pattern 4: Pagination
```sql
-- Offset pagination (slow for large offsets)
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 10000;

-- Cursor pagination (fast)
SELECT * FROM users WHERE id > 10000 ORDER BY id LIMIT 20;
```

#### Pattern 5: Covering Index
```sql
-- Index includes all needed columns
CREATE INDEX idx_covering ON orders(user_id, status, created_at)
INCLUDE (total_amount);

-- Query uses index only, no table access
SELECT user_id, status, created_at, total_amount
FROM orders WHERE user_id = 1;
```

### JOIN Optimization

```sql
-- Ensure indexes on join columns
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_users_id ON users(id);  -- Usually PK

-- Prefer explicit JOIN over implicit
-- Bad
SELECT * FROM users, orders WHERE users.id = orders.user_id;

-- Good
SELECT * FROM users 
INNER JOIN orders ON users.id = orders.user_id;
```

### Common Anti-Patterns

```sql
-- Anti-pattern 1: Function on indexed column
-- Bad (can't use index)
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- Good (create expression index or store lowercase)
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Anti-pattern 2: OR conditions
-- Bad
SELECT * FROM users WHERE status = 'active' OR role = 'admin';

-- Good (use UNION)
SELECT * FROM users WHERE status = 'active'
UNION
SELECT * FROM users WHERE role = 'admin';

-- Anti-pattern 3: Leading wildcard
-- Bad (full table scan)
SELECT * FROM users WHERE name LIKE '%smith';

-- Good (use full-text search)
SELECT * FROM users WHERE name LIKE 'smith%';
```

### Performance Monitoring

```sql
-- Find slow queries (PostgreSQL)
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Table statistics
SELECT relname, seq_scan, idx_scan, n_live_tup
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- Index usage
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Best Practices

1. **Index foreign keys** - Always
2. **Analyze regularly** - Keep statistics fresh
3. **Monitor slow queries** - Use pg_stat_statements
4. **Avoid N+1** - Use eager loading
5. **Use connection pooling** - Reduce connection overhead
6. **Partition large tables** - By date or tenant
