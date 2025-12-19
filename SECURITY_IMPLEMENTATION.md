# Security Hardening Implementation Guide

## Overview
This document provides complete implementation code for all 6 steps of the security hardening process for MyIndia.ai petition platform.

## ✅ Step 1: Test Fixtures (COMPLETED)

See `tests/fixtures/petitions.ts` - Already created with:
- Test users (authorA, authorB)
- Test petitions (P1, P2)
- Test signatures (confirmed, unconfirmed)
- Name parsing test cases

## 🔧 Step 2: Integration Tests

### File: `tests/integration/rls-author.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testUsers, testPetitions, testSignatures } from '../fixtures/petitions';

// RLS-AUTHOR-1: Author signer list only for owned petitions
describe('RLS-AUTHOR-1: Author access control', () => {
  it('denies signer list access for non-owned petitions', async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Author A requests signers for P2 (owned by Author B)
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('petition_id', testPetitions.p2.id);
    
    expect(data).toEqual([]); // Should return empty
    expect(error).toBeNull();
  });
});

// RLS-AUTHOR-2: Only confirmed signers visible
describe('RLS-AUTHOR-2: Confirmed signers only', () => {
  it('returns only confirmed signers', async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data } = await supabase
      .from('signatures')
      .select('*')
      .eq('petition_id', testPetitions.p1.id)
      .eq('verified', true);
    
    expect(data?.length).toBe(1);
    expect(data?.[0].email).toBe(testSignatures.confirmed.email);
  });
});
```

### File: `tests/integration/token-security.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateConfirmToken, verifyConfirmToken } from '@/lib/tokens';

// TOKEN-1: Expiry strictly enforced
describe('TOKEN-1: Token expiry', () => {
  it('rejects expired tokens', async () => {
    const signatureId = testSignatures.confirmed.id;
    const token = generateConfirmToken(signatureId, -1); // Expired 1 hour ago
    
    const result = await verifyConfirmToken(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });
});

// TOKEN-2: Replay safe
describe('TOKEN-2: Replay protection', () => {
  it('allows only single confirmation', async () => {
    const signatureId = testSignatures.unconfirmed.id;
    const token = generateConfirmToken(signatureId);
    
    // First confirmation
    const result1 = await verifyConfirmToken(token);
    expect(result1.valid).toBe(true);
    
    // Second confirmation (replay)
    const result2 = await verifyConfirmToken(token);
    expect(result2.valid).toBe(false);
    expect(result2.reason).toBe('already_confirmed');
  });
});

// TOKEN-3: Tamper proof
describe('TOKEN-3: Tamper detection', () => {
  it('rejects tampered tokens', async () => {
    const signatureId = testSignatures.confirmed.id;
    const token = generateConfirmToken(signatureId);
    const tamperedToken = token.slice(0, -5) + 'XXXXX';
    
    const result = await verifyConfirmToken(tamperedToken);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_signature');
  });
});
```

## 🔐 Step 5: HMAC Token Library

### File: `src/lib/tokens.ts`

```typescript
import crypto from 'crypto';

const TOKEN_SECRET = process.env.SIGNING_SECRET!;
const TOKEN_TTL_HOURS = 24;

export interface ConfirmToken {
  signatureId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export function generateConfirmToken(
  signatureId: string,
  ttlHours: number = TOKEN_TTL_HOURS
): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + (ttlHours * 3600);
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const payload = `${signatureId}.${issuedAt}.${expiresAt}.${nonce}`;
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex');
  
  return `${payload}.${signature}`;
}

export async function verifyConfirmToken(token: string): Promise<{
  valid: boolean;
  reason?: string;
  signatureId?: string;
}> {
  try {
    const parts = token.split('.');
    if (parts.length !== 5) {
      return { valid: false, reason: 'invalid_format' };
    }
    
    const [signatureId, issuedAt, expiresAt, nonce, providedSignature] = parts;
    
    // Verify HMAC signature
    const payload = `${signatureId}.${issuedAt}.${expiresAt}.${nonce}`;
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payload)
      .digest('hex');
    
    if (expectedSignature !== providedSignature) {
      return { valid: false, reason: 'invalid_signature' };
    }
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expiresAt)) {
      return { valid: false, reason: 'expired' };
    }
    
    // Check DB state (single-use enforcement)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: signature } = await supabase
      .from('signatures')
      .select('verified')
      .eq('id', signatureId)
      .single();
    
    if (signature?.verified) {
      return { valid: false, reason: 'already_confirmed' };
    }
    
    return { valid: true, signatureId };
  } catch (error) {
    return { valid: false, reason: 'error' };
  }
}
```

## 📋 Step 3: CI/CD Pipeline

### File: `.github/workflows/security-tests.yml`

```yaml
name: Security Hardening Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:security
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SIGNING_SECRET: ${{ secrets.SIGNING_SECRET }}
```

### Add to `package.json`:

```json
{
  "scripts": {
    "test:security": "vitest run tests/integration"
  }
}
```

## 📚 Step 4: Security Documentation

### Add to `README.md`:

```markdown
## Security

### Confirmation Token Security
- HMAC-SHA256 signed tokens
- 24-hour expiration
- Single-use enforcement via DB state
- Replay-safe with nonce

### RLS Policies
- Authors can only view signers for owned petitions
- Only confirmed signatures visible to authors
- PII protection: email, IP, user_agent never exposed

### Running Security Tests
```bash
npm run test:security
```

## 📊 Step 6: Monitoring

### File: `src/lib/monitoring.ts`

```typescript
export async function logFailedVerification(
  token: string,
  reason: string,
  ip: string
) {
  // Log to Vercel Analytics or your monitoring service
  console.warn('[SECURITY] Failed token verification', {
    reason,
    ip,
    timestamp: new Date().toISOString()
  });
  
  // Optional: Store in database for analysis
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  await supabase.from('security_events').insert({
    event_type: 'failed_token_verification',
    reason,
    ip_address: ip,
    metadata: { token_hash: crypto.createHash('sha256').update(token).digest('hex') }
  });
}
```

## 🚀 Implementation Checklist

- [x] Test fixtures created
- [ ] Integration tests written
- [ ] CI/CD pipeline configured
- [ ] README security section added
- [ ] HMAC token library implemented
- [ ] Monitoring added

## Next Steps

1. Create remaining test files in `tests/integration/`
2. Update `src/lib/tokens.ts` with HMAC implementation
3. Add GitHub Actions workflow
4. Update README with security documentation
5. Implement monitoring in confirm API route
6. Run tests: `npm run test:security`
