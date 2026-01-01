---
name: typescript-review
description: Review TypeScript and JavaScript code changes for compliance with coding standards, style violations, and code quality issues. Use when reviewing pull requests or diffs containing TypeScript/JavaScript code.
---

## TypeScript Code Review

Guidelines for reviewing TypeScript/JavaScript code quality.

### When to Use This Skill

- Reviewing pull requests
- Code quality checks
- Style compliance verification
- Best practices enforcement

### Type Safety Checks

#### Required Patterns
```typescript
// Always define return types
function calculateScore(value: number): number {
  return value * 100;
}

// Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Prefer unknown over any
function parseJSON(input: string): unknown {
  return JSON.parse(input);
}

// Use type guards
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}
```

#### Anti-Patterns to Flag
```typescript
// ❌ Using any
function process(data: any) { }

// ❌ Missing return type
function getData() {
  return fetch('/api/data');
}

// ❌ Type assertion without validation
const user = data as User;

// ❌ Non-null assertion abuse
const value = obj!.property!.nested!;
```

### React/Component Patterns

#### Good Patterns
```typescript
// Props interface with children
interface Props {
  title: string;
  children: React.ReactNode;
}

// Memo for expensive renders
const ExpensiveList = React.memo(({ items }: Props) => {
  return items.map(item => <Item key={item.id} {...item} />);
});

// Custom hooks start with 'use'
function useKPIData(id: string) {
  const [data, setData] = useState<KPI | null>(null);
  // ...
  return { data, loading, error };
}
```

#### Issues to Flag
```typescript
// ❌ Missing key in list
items.map(item => <Item {...item} />);

// ❌ Index as key
items.map((item, index) => <Item key={index} {...item} />);

// ❌ Inline objects in render (causes re-renders)
<Component style={{ margin: 10 }} />

// ❌ Direct state mutation
state.items.push(newItem);

// ❌ Missing dependency in useEffect
useEffect(() => {
  fetchData(userId);
}, []); // userId missing
```

### Error Handling

#### Required
```typescript
// Try-catch with specific error types
try {
  await api.createUser(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation
  } else if (error instanceof NetworkError) {
    // Handle network
  } else {
    throw error; // Re-throw unknown errors
  }
}

// Async function error boundaries
async function fetchData(): Promise<Data | null> {
  try {
    return await api.getData();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    return null;
  }
}
```

### Naming Conventions

```typescript
// ✅ PascalCase for types/interfaces/classes
interface UserProfile { }
class AuthService { }
type ButtonVariant = 'primary' | 'secondary';

// ✅ camelCase for variables/functions
const userName = 'John';
function calculateTotal() { }

// ✅ UPPER_SNAKE_CASE for constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = '/api/v1';

// ✅ Descriptive boolean names
const isLoading = true;
const hasPermission = false;
const canEdit = true;
```

### Code Organization

```typescript
// Import order
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal modules
import { api } from '@/api';
import { Button } from '@/components/ui';

// 3. Types
import type { User, KPI } from '@/types';

// 4. Styles/assets
import styles from './Component.module.css';
```

### Review Checklist

- [ ] Types are properly defined (no `any`)
- [ ] Functions have return types
- [ ] Error handling is comprehensive
- [ ] No console.log in production code
- [ ] Proper null/undefined checks
- [ ] React keys are unique and stable
- [ ] useEffect dependencies are correct
- [ ] No direct state mutations
- [ ] Naming follows conventions
- [ ] Imports are organized
- [ ] No hardcoded strings (use constants)
- [ ] Security: No sensitive data exposure
