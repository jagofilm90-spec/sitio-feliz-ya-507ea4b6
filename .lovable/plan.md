

## Fix: Add "paquete" to database enum `unit_type`

### Problem
The frontend allows selecting "Paquete" as a unit, but the database enum `unit_type` doesn't include `"paquete"`, causing an insert error.

### Solution
Run a single database migration to add the value:

```sql
ALTER TYPE unit_type ADD VALUE IF NOT EXISTS 'paquete';
```

### Files changed
None — this is a database-only migration.

