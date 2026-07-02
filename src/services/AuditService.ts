export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  payload?: unknown;
  role?: string;
  previousHash: string;
  hash: string;
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function computeEntryHash(entry: Omit<AuditEntry, 'hash'>): Promise<string> {
  const serialized = JSON.stringify({
    timestamp: entry.timestamp,
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    ip: entry.ip,
    payload: entry.payload || null,
    role: entry.role || null,
    previousHash: entry.previousHash
  });
  return sha256(serialized);
}

const BASE_ENTRIES = [
  { timestamp: "2026-06-01T08:00:00Z", actor: "System Daemon", action: "Key rotation", target: "SHA-256 Ledger Root", ip: "Vault Server" },
  { timestamp: "2026-06-05T09:11:02Z", actor: "Raya Surya (User)", action: "Login success", target: "PharmaGuard Identity", ip: "19.82.110.5" },
  { timestamp: "2026-06-08T14:19:40Z", actor: "Planner (Agent)", action: "Flow instantiated", target: "Pembrolizumab Weekly", ip: "Agent Node D" },
  { timestamp: "2026-06-08T14:22:18Z", actor: "Raya Surya (User)", action: "Signature applied", target: "COMP-2026-003 (Pembrolizumab)", ip: "19.82.110.5" },
  { timestamp: "2026-06-10T16:14:05Z", actor: "PHI Guard (Agent)", action: "PHI scan", target: "Dupixent Dataset", ip: "Agent Node A" },
  { timestamp: "2026-06-10T16:15:22Z", actor: "Raya Surya (User)", action: "Signature applied", target: "COMP-2026-002 (Dupixent)", ip: "192.168.1.14" },
  { timestamp: "2026-06-11T09:30:00Z", actor: "Raya Surya (User)", action: "Login success", target: "PharmaGuard Identity", ip: "192.168.1.14" },
  { timestamp: "2026-06-12T10:14:15Z", actor: "Raya Surya (User)", action: "Threshold changed", target: "PRR Floor 1.5 -> 2.0", ip: "192.168.1.14" },
  { timestamp: "2026-06-12T11:05:32Z", actor: "Medical Reviewer (Agent)", action: "ClinVar lookup", target: "CYP2D6 *4 Variant", ip: "Agent Node C" },
  { timestamp: "2026-06-12T15:20:10Z", actor: "Raya Surya (User)", action: "Report exported", target: "Dupixent B/R (eCTD)", ip: "192.168.1.14" },
  { timestamp: "2026-06-12T18:41:45Z", actor: "PHI Guard (Agent)", action: "PHI scan", target: "Metformin Signal Dataset", ip: "Agent Node A" },
  { timestamp: "2026-06-12T18:42:01Z", actor: "Raya Surya (User)", action: "Signature applied", target: "COMP-2026-001 (Metformin)", ip: "192.168.1.14" }
];

export async function initializeLedger(): Promise<AuditEntry[]> {
  const ledger: AuditEntry[] = [];
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  
  for (const base of BASE_ENTRIES) {
    const entryWithoutHash: Omit<AuditEntry, 'hash'> = {
      ...base,
      previousHash: prevHash
    };
    const hash = await computeEntryHash(entryWithoutHash);
    const entry: AuditEntry = {
      ...entryWithoutHash,
      hash
    };
    ledger.push(entry);
    prevHash = hash;
  }
  
  return ledger;
}

export async function getLedger(): Promise<AuditEntry[]> {
  const stored = localStorage.getItem("winnow_audit_ledger");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fallback if parsing fails
    }
  }
  const initialized = await initializeLedger();
  saveLedger(initialized);
  return initialized;
}

export function saveLedger(ledger: AuditEntry[]): void {
  localStorage.setItem("winnow_audit_ledger", JSON.stringify(ledger));
}

export async function appendEntry(
  ledger: AuditEntry[],
  actor: string,
  action: string,
  target: string,
  ip: string,
  payload?: unknown,
  role?: string
): Promise<AuditEntry[]> {
  const prevEntry = ledger[ledger.length - 1];
  const previousHash = prevEntry ? prevEntry.hash : "0000000000000000000000000000000000000000000000000000000000000000";
  
  const entryWithoutHash: Omit<AuditEntry, 'hash'> = {
    timestamp: new Date().toISOString(),
    actor,
    action,
    target,
    ip,
    payload,
    role,
    previousHash
  };
  
  const hash = await computeEntryHash(entryWithoutHash);
  const newEntry: AuditEntry = {
    ...entryWithoutHash,
    hash
  };
  
  const updatedLedger = [...ledger, newEntry];
  saveLedger(updatedLedger);
  return updatedLedger;
}

export async function verifyIntegrity(ledger: AuditEntry[]): Promise<boolean> {
  if (ledger.length === 0) return true;
  
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  
  for (const entry of ledger) {
    if (entry.previousHash !== prevHash) {
      return false;
    }
    const computedHash = await computeEntryHash(entry);
    if (entry.hash !== computedHash) {
      return false;
    }
    prevHash = entry.hash;
  }
  
  return true;
}
