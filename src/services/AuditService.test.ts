import { describe, it, expect, beforeEach } from 'vitest';
import { 
  initializeLedger, 
  appendEntry, 
  verifyIntegrity, 
  getLedger
} from './AuditService';

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();

globalThis.localStorage = localStorageMock as unknown as Storage;

describe('AuditService', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should initialize a cryptographically valid ledger', async () => {
    const ledger = await initializeLedger();
    expect(ledger.length).toBe(12);
    
    // First entry has the genesis previousHash
    expect(ledger[0].previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    
    // Ledger passes integrity verification
    const isValid = await verifyIntegrity(ledger);
    expect(isValid).toBe(true);
  });

  it('should append new entries and maintain integrity', async () => {
    let ledger = await getLedger();
    expect(ledger.length).toBe(12);

    ledger = await appendEntry(
      ledger,
      'User-1',
      'Test Action',
      'Test Target',
      '127.0.0.1',
      { data: 'payload' }
    );

    expect(ledger.length).toBe(13);
    expect(ledger[12].actor).toBe('User-1');
    expect(ledger[12].previousHash).toBe(ledger[11].hash);

    const isValid = await verifyIntegrity(ledger);
    expect(isValid).toBe(true);
  });

  it('should fail integrity verification if any historical entry is mutated', async () => {
    const ledger = await getLedger();
    expect(await verifyIntegrity(ledger)).toBe(true);

    // Mutate the actor of the 5th entry
    const mutatedLedger = JSON.parse(JSON.stringify(ledger));
    mutatedLedger[4].actor = 'Imposter Agent';

    expect(await verifyIntegrity(mutatedLedger)).toBe(false);
  });

  it('should fail integrity verification if previousHash links are broken', async () => {
    const ledger = await getLedger();
    expect(await verifyIntegrity(ledger)).toBe(true);

    // Swap hash links
    const mutatedLedger = JSON.parse(JSON.stringify(ledger));
    mutatedLedger[5].previousHash = 'brokenhash123';

    expect(await verifyIntegrity(mutatedLedger)).toBe(false);
  });
});
