// Test fixtures for petitions and signatures
// Used for RLS, token, and data quality tests

export const testUsers = {
  authorA: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'author-a@test.com',
    name: 'Author A'
  },
  authorB: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'author-b@test.com',
    name: 'Author B'
  }
};

export const testPetitions = {
  p1: {
    id: '10000000-0000-0000-0000-000000000001',
    author_id: testUsers.authorA.id,
    title: 'Test Petition 1 by Author A',
    description: 'Test description',
    status: 'active' as const
  },
  p2: {
    id: '10000000-0000-0000-0000-000000000002',
    author_id: testUsers.authorB.id,
    title: 'Test Petition 2 by Author B',
    description: 'Test description',
    status: 'active' as const
  }
};

export const testSignatures = {
  confirmed: {
    id: '20000000-0000-0000-0000-000000000001',
    petition_id: testPetitions.p1.id,
    full_name: 'John Smith',
    email: 'john@test.com',
    verified: true,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0'
  },
  unconfirmed: {
    id: '20000000-0000-0000-0000-000000000002',
    petition_id: testPetitions.p1.id,
    full_name: 'Jane Doe',
    email: 'jane@test.com',
    verified: false,
    ip_address: '192.168.1.2',
    user_agent: 'Mozilla/5.0'
  }
};

// Test cases for name parsing (DATA-QUALITY-1)
export const nameTestCases = [
  { input: 'Madonna', expected: 'Madonna' },
  { input: 'A B', expected: 'A' },
  { input: '  John Smith  ', expected: 'John' },
  { input: 'राज कुमार', expected: 'राज' },
  { input: 'Mohammed ibn Abdullah', expected: 'Mohammed' },
  { input: '', expected: '' },
  { input: '   ', expected: '' }
];
