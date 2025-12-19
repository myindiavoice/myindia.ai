/**
 * Hardening Tests for /api/petitions/[id]/signers endpoint
 * 
 * Tests verify:
 * - Author can fetch signers for own petition
 * - Author cannot fetch signers for other's petition  
 * - Anonymous users cannot fetch
 * - No PII (email/IP) ever returned
 * - Only confirmed signatures appear
 * - Pagination works correctly
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const STAGING_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

describe('API Signers Endpoint - Hardening Tests', () => {
  let authorUser: { id: string; email: string; session: any };
  let otherUser: { id: string; email: string; session: any };
  let ownedPetitionId: string;
  let othersPetitionId: string;
  let confirmedSignatureId: string;
  let unconfirmedSignatureId: string;

  beforeAll(async () => {
    // Create two test users
    const author = await serviceClient.auth.admin.createUser({
      email: `author-${Date.now()}@test.com`,
      password: 'TestPass123!',
      email_confirm: true,
    });
    
    const other = await serviceClient.auth.admin.createUser({
      email: `other-${Date.now()}@test.com`,
      password: 'TestPass123!',
      email_confirm: true,
    });

    if (!author.data.user || !other.data.user) {
      throw new Error('Failed to create test users');
    }

    authorUser = {
      id: author.data.user.id,
      email: author.data.user.email!,
      session: null,
    };

    otherUser = {
      id: other.data.user.id,
      email: other.data.user.email!,
      session: null,
    };

    // Sign in both users to get sessions
    const authorSignIn = await serviceClient.auth.signInWithPassword({
      email: authorUser.email,
      password: 'TestPass123!',
    });

    const otherSignIn = await serviceClient.auth.signInWithPassword({
      email: otherUser.email,
      password: 'TestPass123!',
    });

    authorUser.session = authorSignIn.data.session;
    otherUser.session = otherSignIn.data.session;

    // Create petition owned by author
    const { data: ownedPetition } = await serviceClient
      .from('petitions')
      .insert({
        title: 'Author Owned Petition',
        description: 'Test petition',
        author_id: authorUser.id,
        status: 'active',
      })
      .select('id')
      .single();

    ownedPetitionId = ownedPetition!.id;

    // Create petition owned by other user
    const { data: otherPetition } = await serviceClient
      .from('petitions')
      .insert({
        title: 'Other User Petition',
        description: 'Test petition',
        author_id: otherUser.id,
        status: 'active',
      })
      .select('id')
      .single();

    othersPetitionId = otherPetition!.id;

    // Add confirmed signature
    const { data: confirmedSig } = await serviceClient
      .from('signatures')
      .insert({
        petition_id: ownedPetitionId,
        full_name: 'Confirmed Test User',
        email: 'confirmed@test.com',
        ip_address: '192.168.1.1',
        status: 'confirmed',
      })
      .select('id')
      .single();

    confirmedSignatureId = confirmedSig!.id;

    // Add unconfirmed signature
    const { data: unconfirmedSig } = await serviceClient
      .from('signatures')
      .insert({
        petition_id: ownedPetitionId,
        full_name: 'Unconfirmed Test User',
        email: 'unconfirmed@test.com',
        ip_address: '192.168.1.2',
        status: 'pending',
      })
      .select('id')
      .single();

    unconfirmedSignatureId = unconfirmedSig!.id;

    // Add multiple confirmed signatures for pagination test
    for (let i = 0; i < 60; i++) {
      await serviceClient.from('signatures').insert({
        petition_id: ownedPetitionId,
        full_name: `Test User ${i}`,
        email: `test${i}@test.com`,
        ip_address: `192.168.1.${i % 255}`,
        status: 'confirmed',
      });
    }
  });

  afterAll(async () => {
    // Cleanup
    if (confirmedSignatureId) {
      await serviceClient.from('signatures').delete().eq('id', confirmedSignatureId);
    }
    if (unconfirmedSignatureId) {
      await serviceClient.from('signatures').delete().eq('id', unconfirmedSignatureId);
    }
    if (ownedPetitionId) {
      await serviceClient.from('signatures').delete().eq('petition_id', ownedPetitionId);
      await serviceClient.from('petitions').delete().eq('id', ownedPetitionId);
    }
    if (othersPetitionId) {
      await serviceClient.from('petitions').delete().eq('id', othersPetitionId);
    }
    if (authorUser?.id) {
      await serviceClient.auth.admin.deleteUser(authorUser.id);
    }
    if (otherUser?.id) {
      await serviceClient.auth.admin.deleteUser(otherUser.id);
    }
  });

  // TEST 1: Author can fetch signers for own petition
  it('RLS-AUTHOR-1: Author can fetch signers for own petition → returns names + verified', async () => {
    const response = await fetch(
      `${STAGING_URL}/api/petitions/${ownedPetitionId}/signers`,
      {
        headers: {
          Authorization: `Bearer ${authorUser.session.access_token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    expect(data.signers).toBeDefined();
    expect(Array.isArray(data.signers)).toBe(true);
    expect(data.total).toBeGreaterThan(0);
    
    // Should include the confirmed signature
    const confirmedEntry = data.signers.find(
      (s: any) => s.first_name === 'Confirmed'
    );
    expect(confirmedEntry).toBeDefined();
    expect(confirmedEntry.verified).toBe(true);
  });

  // TEST 2: Author cannot fetch signers for other's petition
  it('RLS-AUTHOR-2: Author cannot fetch signers for someone else\'s petition → error', async () => {
    const response = await fetch(
      `${STAGING_URL}/api/petitions/${othersPetitionId}/signers`,
      {
        headers: {
          Authorization: `Bearer ${authorUser.session.access_token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Should return empty array (RLS enforcement)
    expect(data.signers).toEqual([]);
    expect(data.total).toBe(0);
  });

  // TEST 3: Anonymous cannot fetch
  it('RLS-AUTHOR-3: Anonymous cannot fetch → error "Not authenticated"', async () => {
    const response = await fetch(
      `${STAGING_URL}/api/petitions/${ownedPetitionId}/signers`
    );

    expect(response.status).toBe(401);
    
    const data = await response.json();
    
    expect(data.error).toBe('Unauthorized');
  });

  // TEST 4: No PII ever returned
  it('RLS-AUTHOR-4: No emails/IPs ever returned → inspect payload', async () => {
    const response = await fetch(
      `${STAGING_URL}/api/petitions/${ownedPetitionId}/signers`,
      {
        headers: {
          Authorization: `Bearer ${authorUser.session.access_token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    expect(data.signers.length).toBeGreaterThan(0);
    
    // Check that NO signer contains email, ip_address, or other PII
    data.signers.forEach((signer: any) => {
      expect(signer.email).toBeUndefined();
      expect(signer.ip_address).toBeUndefined();
      expect(signer.full_name).toBeUndefined();
      expect(signer.user_agent).toBeUndefined();
      
      // Should only have first_name, verified, confirmed_at
      expect(signer.first_name).toBeDefined();
      expect(typeof signer.verified).toBe('boolean');
      expect(signer.confirmed_at).toBeDefined();
    });
  });

  // TEST 5: Unconfirmed signatures never appear
  it('DATA-QUALITY-1: Unconfirmed signatures never appear → only confirmed returned', async () => {
    const response = await fetch(
      `${STAGING_URL}/api/petitions/${ownedPetitionId}/signers`,
      {
        headers: {
          Authorization: `Bearer ${authorUser.session.access_token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Should NOT include the unconfirmed signature
    const unconfirmedEntry = data.signers.find(
      (s: any) => s.first_name === 'Unconfirmed'
    );
    expect(unconfirmedEntry).toBeUndefined();
    
    // All returned signers must have status 'confirmed'
    data.signers.forEach((signer: any) => {
      // Status field should not be returned, but we verify via RLS
      expect(signer.status).toBeUndefined();
    });
  });

  // TEST 6: Pagination works
  it('PAGINATION-1: Pagination works → offset/limit returns consistent slices', async () => {
    // Fetch first page
    const page1 = await fetch(
      `${STAGING_URL}/api/petitions/${ownedPetitionId}/signers?limit=10&offset=0`,
      {
        headers: {
          Authorization: `Bearer ${authorUser.session.access_token}`,
        },
      }
    );

    const data1 = await page1.json();
    
    expect(data1.signers.length).toBe(10);
    expect(data1.limit).toBe(10);
    expect(data1.offset).toBe(0);
    
    // Fetch second page
    const page2 = await fetch(
      `${STAGING_URL}/api/petitions/${ownedPetitionId}/signers?limit=10&offset=10`,
      {
        headers: {
          Authorization: `Bearer ${authorUser.session.access_token}`,
        },
      }
    );

    const data2 = await page2.json();
    
    expect(data2.signers.length).toBe(10);
    expect(data2.limit).toBe(10);
    expect(data2.offset).toBe(10);
    
    // Verify no overlap between pages
    const page1Names = data1.signers.map((s: any) => s.first_name);
    const page2Names = data2.signers.map((s: any) => s.first_name);
    
    const overlap = page1Names.filter((name: string) => page2Names.includes(name));
    expect(overlap.length).toBe(0);
  });

  // TEST 7: Limit capping
  it('PAGINATION-2: Limit is capped at 200', async () => {
    const response = await fetch(
      `${STAGING_URL}/api/petitions/${ownedPetitionId}/signers?limit=500`,
      {
        headers: {
          Authorization: `Bearer ${authorUser.session.access_token}`,
        },
      }
    );

    const data = await response.json();
    
    // Limit should be capped at 200
    expect(data.limit).toBeLessThanOrEqual(200);
  });
});
