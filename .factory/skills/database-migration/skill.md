---
name: database-migration
description: Execute database migrations across ORMs and platforms with zero-downtime strategies, data transformation, and rollback procedures. Use when migrating databases, changing schemas, performing data transformations, or implementing zero-downtime deployment strategies.
---

## Database Migration

Comprehensive patterns for database migrations with zero-downtime strategies.

### When to Use This Skill

- Running Prisma migrations
- Schema changes in production
- Data transformations
- Zero-downtime deployments
- Rollback procedures

### Prisma Migration Workflow

#### Development Workflow
```bash
# Create migration from schema changes
npx prisma migrate dev --name add_user_roles

# Reset database (dev only)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

#### Production Workflow
```bash
# Deploy migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Zero-Downtime Migration Patterns

#### Pattern 1: Expand-Contract (Add Column)
```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN new_field varchar(255);

-- Step 2: Backfill data (in batches)
UPDATE users SET new_field = old_field WHERE new_field IS NULL LIMIT 1000;

-- Step 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN new_field SET NOT NULL;

-- Step 4: Remove old column (after app updated)
ALTER TABLE users DROP COLUMN old_field;
```

#### Pattern 2: Rename Column Safely
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN display_name varchar(255);

-- Step 2: Create trigger for sync
CREATE TRIGGER sync_name
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION sync_name_columns();

-- Step 3: Backfill
UPDATE users SET display_name = name;

-- Step 4: Update app to use new column
-- Step 5: Remove old column and trigger
```

### Prisma Schema Patterns

#### Adding Required Field
```prisma
// schema.prisma - Step 1: Add optional
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      String?  // Optional first
}

// After backfill - Step 2: Make required
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      String   @default("user")
}
```

#### Adding Relation
```prisma
model Department {
  id        String     @id @default(uuid())
  name      String
  employees Employee[]
}

model Employee {
  id           String      @id @default(uuid())
  name         String
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])
}
```

### Data Transformation Scripts

```typescript
// Prisma batch update
async function backfillData() {
  const batchSize = 1000;
  let processed = 0;
  
  while (true) {
    const records = await prisma.user.findMany({
      where: { newField: null },
      take: batchSize,
    });
    
    if (records.length === 0) break;
    
    await prisma.$transaction(
      records.map(r => 
        prisma.user.update({
          where: { id: r.id },
          data: { newField: computeValue(r) }
        })
      )
    );
    
    processed += records.length;
    console.log(`Processed ${processed} records`);
  }
}
```

### Rollback Strategies

1. **Keep old columns** until migration verified
2. **Use feature flags** for new code paths
3. **Maintain backward compatibility** in schema
4. **Test rollback in staging** before production
5. **Have SQL rollback scripts** ready

### Best Practices

- Always backup before migration
- Test migrations on staging first
- Use transactions where possible
- Batch large data updates
- Monitor performance during migration
- Keep migrations small and focused
- Document breaking changes
