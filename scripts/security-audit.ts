/**
 * OptixOS Automated Security & Vulnerability Audit Scanner
 * Run via: npm run audit:security
 *
 * Scans the codebase for:
 * 1. Active in-code security annotations (TODO(security-SEC-XXX))
 * 2. Active in-code bug annotations (TODO(bug-BUG-XXX))
 * 3. Cross-reference consistency with docs/agent-memory/SECURITY_LOG.md
 * 4. Sensitive wholesale costPrice leaks in print/workshop/customer views
 * 5. Direct verification of open vs resolved security backlog items
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  type: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  tagId?: string;
}

const findings: Finding[] = [];

function scanDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        file === 'node_modules' ||
        file === '.next' ||
        file === '.git' ||
        file === 'graphify-out' ||
        file === 'archive'
      ) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    // 1. Detect in-code security debt tags
    if (line.includes('TODO(security')) {
      const match = line.match(/TODO\(security(?:-([A-Z0-9-]+))?\)/);
      const tagId = match && match[1] ? match[1] : undefined;

      findings.push({
        file: relPath,
        line: lineNum,
        type: 'SECURITY_DEBT',
        message: line.trim(),
        severity: tagId ? 'MEDIUM' : 'HIGH', // Untagged is higher severity because it lacks registry tracking
        tagId,
      });
    }

    // 2. Detect in-code bug tags
    if (line.includes('TODO(bug')) {
      const match = line.match(/TODO\(bug(?:-([A-Z0-9-]+))?\)/);
      const tagId = match && match[1] ? match[1] : undefined;

      findings.push({
        file: relPath,
        line: lineNum,
        type: 'BUG_DEBT',
        message: line.trim(),
        severity: 'LOW',
        tagId,
      });
    }

    // 3. Detect unhandled costPrice DOM leaks in client print components
    if (
      (relPath.includes('components/print') || relPath.includes('components/receipt')) &&
      (line.includes('costPrice') || line.includes('cost_price')) &&
      !line.includes('//') // ignore comments
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        type: 'WHOLESALE_COST_LEAK',
        message: 'Potential wholesale cost leak detected in print/receipt component',
        severity: 'CRITICAL',
      });
    }
  });
}

console.log('\n==================================================================');
console.log('       OptixOS Automated Security & Vulnerability Audit Scanner     ');
console.log('==================================================================\n');

// 1. Scan src/ directory
scanDirectory(path.join(process.cwd(), 'src'));

// 2. Parse docs/agent-memory/SECURITY_LOG.md
const secLogPath = path.join(process.cwd(), 'docs', 'agent-memory', 'SECURITY_LOG.md');
const registeredSecIds = new Set<string>();
let openSecCount = 0;
let resolvedSecCount = 0;

if (fs.existsSync(secLogPath)) {
  const secContent = fs.readFileSync(secLogPath, 'utf-8');
  const idMatches = secContent.matchAll(/###\s*\[(SEC-\d+)\]/g);
  for (const m of idMatches) {
    registeredSecIds.add(m[1]);
  }

  openSecCount = (secContent.match(/\*\*Status\*\*:\s*`OPEN`/g) || []).length;
  resolvedSecCount = (secContent.match(/\*\*Status\*\*:\s*`RESOLVED`/g) || []).length;
}

// 3. Check for in-code tags without matching registry entries
findings.forEach((f) => {
  if (f.type === 'SECURITY_DEBT') {
    if (!f.tagId) {
      f.type = 'UNTRACKED_SECURITY_DEBT';
      f.severity = 'HIGH';
      f.message += ' (ERROR: Missing SEC-XXX identifier! Must register in SECURITY_LOG.md)';
    } else if (!registeredSecIds.has(f.tagId)) {
      f.type = 'UNREGISTERED_SECURITY_TAG';
      f.severity = 'HIGH';
      f.message += ` (ERROR: Tag '${f.tagId}' not found in docs/agent-memory/SECURITY_LOG.md!)`;
    }
  }
});

// 4. Output findings
console.log(`Audited 'src/' directory... Found ${findings.length} tracked annotations & items:\n`);

if (findings.length === 0) {
  console.log('  [PASS] Zero unresolved security annotations or leaks found!\n');
} else {
  findings.forEach((f, i) => {
    let color = '\x1b[33m'; // yellow
    if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
      color = '\x1b[31m'; // red
    } else if (f.severity === 'LOW') {
      color = '\x1b[36m'; // cyan
    }

    console.log(
      `  ${i + 1}. [${color}${f.severity}\x1b[0m] ${f.type} in ${f.file}:${f.line}`
    );
    console.log(`     ${f.message}\n`);
  });
}

// 5. Registry summary
console.log('------------------------------------------------------------------');
console.log(`docs/agent-memory/SECURITY_LOG.md Registry Status:`);
console.log(`  - Registered Vulnerability IDs: ${Array.from(registeredSecIds).join(', ') || 'None'}`);
console.log(`  - Open Vulnerabilities / Tracked Debt: ${openSecCount}`);
console.log(`  - Resolved & Mitigated Vulnerabilities: ${resolvedSecCount}`);

// 6. Bug log summary
const bugLogPath = path.join(process.cwd(), 'docs', 'agent-memory', 'BUG_FIX_LOG.md');
if (fs.existsSync(bugLogPath)) {
  const bugContent = fs.readFileSync(bugLogPath, 'utf-8');
  const bugMatches = bugContent.matchAll(/###\s*\[BUG-(\d+)\]/g);
  const bugIds = Array.from(bugMatches).map((m) => `BUG-${m[1]}`);
  console.log(`docs/agent-memory/BUG_FIX_LOG.md Registry Status:`);
  console.log(`  - Historical Bugs Documented: ${bugIds.length} (${bugIds.slice(-5).join(', ')}...)`);
}
console.log('------------------------------------------------------------------\n');

// 7. Check for critical or unregistered blocking failures
const criticalCount = findings.filter(
  (f) => f.severity === 'CRITICAL' || f.type.startsWith('UN')
).length;

if (criticalCount > 0) {
  console.error(`[AUDIT FAILED] Found ${criticalCount} critical violation(s) or unregistered security debt tags.\n`);
  process.exit(1);
} else {
  console.log('[AUDIT PASS] Continuous security & vulnerability audit finished with 0 critical violations.\n');
  process.exit(0);
}
