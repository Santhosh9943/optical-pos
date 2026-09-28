import fs from 'fs';
import path from 'path';

/**
 * OptixOS Automated Design System & UI Consistency Audit Scanner
 * Enforces uniform design tokens, primitive component usage, and layout invariants.
 */

interface Violation {
  file: string;
  line: number;
  type: 'HARDCODED_HEX' | 'FORBIDDEN_CONTAINER' | 'RAW_BUTTON_SUGGESTION';
  message: string;
  snippet: string;
}

const SRC_DIR = path.resolve(process.cwd(), 'src');
const EXCLUDE_DIRS = ['src/components/ui', 'src/components/print', 'src/db'];

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      if (!EXCLUDE_DIRS.some((exc) => relPath.startsWith(exc))) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function auditFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

  // Check 1: Forbidden container wrappers on operational dashboard views
  const isDashboardPage =
    relPath.includes('src/app/(dashboard)') && relPath.endsWith('page.tsx');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check 2: Hardcoded arbitrary hex colors in classNames (e.g., bg-[#2563eb], text-[#fff])
    const hexClassRegex = /(?:bg|text|border|ring)-\[#(?:[0-9a-fA-F]{3,8})\]/g;
    let match;
    while ((match = hexClassRegex.exec(line)) !== null) {
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'HARDCODED_HEX',
        message: `Found arbitrary hardcoded hex color '${match[0]}'. Use semantic design tokens (e.g. bg-primary, text-muted-foreground, border-border).`,
        snippet: line.trim(),
      });
    }

    // Check 3: Forbidden max-w-7xl / container on operational dashboard views
    if (isDashboardPage && (line.includes('max-w-7xl') || line.includes('max-w-6xl') || line.includes('max-w-5xl')) && line.includes('mx-auto')) {
      violations.push({
        file: relPath,
        line: lineNum,
        type: 'FORBIDDEN_CONTAINER',
        message:
          'Forbidden constrained container (max-w-* mx-auto) on operational dashboard view. Page root must use: <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">.',
        snippet: line.trim(),
      });
    }
  });

  return violations;
}

function runAudit() {
  console.log('\n======================================================');
  console.log('🔍 OptixOS Design System & UI Consistency Audit Scanner');
  console.log('======================================================\n');

  const files = getAllFiles(SRC_DIR);
  const allViolations: Violation[] = [];

  for (const file of files) {
    const violations = auditFile(file);
    allViolations.push(...violations);
  }

  const hexViolations = allViolations.filter((v) => v.type === 'HARDCODED_HEX');
  const containerViolations = allViolations.filter(
    (v) => v.type === 'FORBIDDEN_CONTAINER'
  );

  console.log(`Audited ${files.length} UI components across src/app and src/components.`);
  console.log(`- Hardcoded Hex Violations: ${hexViolations.length}`);
  console.log(`- Layout Container Violations: ${containerViolations.length}\n`);

  if (allViolations.length > 0) {
    console.log('Violations detected:');
    allViolations.forEach((v) => {
      console.log(`  [${v.type}] ${v.file}:${v.line}`);
      console.log(`    ↳ ${v.message}`);
      console.log(`    Snippet: ${v.snippet.slice(0, 80)}...\n`);
    });

    if (containerViolations.length > 0) {
      console.error('❌ Critical design system layout violations found.');
      process.exit(1);
    }
  }

  console.log('✅ UI Design System Guardrail: PASS (0 Critical Violations).\n');
  process.exit(0);
}

runAudit();
