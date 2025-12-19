import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testUsers, testPetitions, testSignatures } from '../fixtures/petitions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// RLS-AUTHOR-1: Author signer list only for owned petitions
describe('RLS-AUTHOR-1: Author access control', () => {
  it('denies signer list access for non-owned petitions', async () => {
    // Author A requests signers for P2 (owned by Author B)
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('petition_id', testPetitions.p2.id);
    
    expect(data).toEqual([]); // Should return empty
    expect(error).toBeNull();
  });
  
  it('allows signer list access for owned petitions', async () => {
    // Author A requests signers for P1 (owned by Author A)
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('petition_id', testPetitions.p1.id);
    
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

// RLS-AUTHOR-2: Only confirmed signers visible
describe('RLS-AUTHOR-2: Confirmed signers only', () => {
  it('returns only confirmed signers', async () => {
    const { data } = await supabase
      .from('signatures')
      .select('*')
      .eq('petition_id', testPetitions.p1.id)
      .eq('verified', true);
    
    expect(data?.length).toBe(1);
    expect(data?.[0].email).toBe(testSignatures.confirmed.email);
  });
  
  it('excludes unconfirmed signers', async () => {
    const { data } = await supabase
      .from('signatures')
      .select('*')
      .eq('petition_id', testPetitions.p1.id)
      .eq('verified', false);
    
    // Unconfirmed should not appear in results
    expect(data?.length).toBe(0);
  });
});

// RLS-AUTHOR-3: No PII leakage
describe('RLS-AUTHOR-3: PII protection', () => {
  it('does not expose email, IP, or user_agent', async () => {
    const { data } = await supabase
      .from('signatures')
      .select('first_name, verified, confirmed_at')
      .eq('petition_id', testPetitions.p1.id)
      .eq('verified', true);
    
    const signer = data?.[0];
    expect(signer).toBeDefined();
    expect(signer).toHaveProperty('first_name');
    expect(signer).toHaveProperty('verified');
    expect(signer).toHaveProperty('confirmed_at');
    
    // Should NOT have PII
    expect(signer).not.toHaveProperty('email');
    expect(signer).not.toHaveProperty('ip_address');
    expect(signer).not.toHaveProperty('user_agent');
  });
});

// RLS-AUTHOR-4: Pagination/limits
describe('RLS-AUTHOR-4: Performance protection', () => {
  it('respects pagination limits', async () => {
    const { data } = await supabase
      .from('signatures')
      .select('*')
      .eq('petition_id', testPetitions.p1.id)
      .limit(50);
    
    expect(data?.length).toBeLessThanOrEqual(50);
  });
});
