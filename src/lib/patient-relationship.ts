// src/lib/patient-relationship.ts

export interface PatientRelationMeta {
  id?: string;
  fullName?: string;
  relationType?: string | null;
  rawRelationType?: string | null;
  gender?: string | null;
  primaryCustomerId?: string | null;
}

/**
 * Dynamically resolves the relationship label of `target` relative to `currentPatient`.
 * - If target is the currently selected patient, returns "Current".
 * - Reciprocally maps relationships (e.g. if target is root and current is Child, target is Father/Mother/Parent).
 * - Never returns "Self" when a patient is selected.
 */
export function getDynamicRelationship(
  target: PatientRelationMeta,
  currentPatient?: PatientRelationMeta | null
): string {
  if (!target) return 'Family';

  // 1. If target IS the currently selected patient:
  if (target.id && currentPatient?.id && target.id === currentPatient.id) {
    return 'Current';
  }

  // 2. If no current patient is selected yet, return target's stated relation or 'Primary Account'
  if (!currentPatient) {
    const raw = (target.rawRelationType || target.relationType || '').trim();
    if (raw && raw !== 'Self' && raw !== 'Current') {
      return raw;
    }
    return 'Primary Account';
  }

  const currentRootId = currentPatient.primaryCustomerId || currentPatient.id;
  const targetRootId = target.primaryCustomerId || target.id;
  const isCurrentRoot =
    !currentPatient.primaryCustomerId || currentPatient.primaryCustomerId === currentPatient.id;
  const isTargetRoot =
    !target.primaryCustomerId || target.primaryCustomerId === target.id;

  const currentRel = (
    currentPatient.rawRelationType ||
    (currentPatient.relationType !== 'Current' ? currentPatient.relationType : '') ||
    ''
  ).toLowerCase();

  const targetRel = (
    target.rawRelationType ||
    (target.relationType !== 'Current' ? target.relationType : '') ||
    ''
  ).toLowerCase();

  // 3. Current patient is the root/primary account
  // In this case, target's relationship to current is target's defined relation in the family group.
  if (isCurrentRoot) {
    if (targetRel && targetRel !== 'self' && targetRel !== 'current') {
      // Capitalize first letter
      return target.rawRelationType || target.relationType || 'Family';
    }
    return 'Family';
  }

  // 4. Target is the root/primary account (Current is a dependent of Target)
  if (isTargetRoot) {
    if (
      currentRel.includes('child') ||
      currentRel.includes('son') ||
      currentRel.includes('daughter')
    ) {
      return target.gender === 'FEMALE' ? 'Mother' : target.gender === 'MALE' ? 'Father' : 'Parent';
    }
    if (
      currentRel.includes('parent') ||
      currentRel.includes('father') ||
      currentRel.includes('mother')
    ) {
      return target.gender === 'FEMALE' ? 'Daughter' : target.gender === 'MALE' ? 'Son' : 'Child';
    }
    if (
      currentRel.includes('spouse') ||
      currentRel.includes('husband') ||
      currentRel.includes('wife')
    ) {
      return target.gender === 'FEMALE' ? 'Wife' : target.gender === 'MALE' ? 'Husband' : 'Spouse';
    }
    if (
      currentRel.includes('sibling') ||
      currentRel.includes('brother') ||
      currentRel.includes('sister')
    ) {
      return target.gender === 'FEMALE' ? 'Sister' : target.gender === 'MALE' ? 'Brother' : 'Sibling';
    }
    if (currentRel.includes('grandchild') || currentRel.includes('grandson') || currentRel.includes('granddaughter')) {
      return target.gender === 'FEMALE' ? 'Grandmother' : target.gender === 'MALE' ? 'Grandfather' : 'Grandparent';
    }
    if (currentRel.includes('grandparent') || currentRel.includes('grandfather') || currentRel.includes('grandmother')) {
      return target.gender === 'FEMALE' ? 'Granddaughter' : target.gender === 'MALE' ? 'Grandson' : 'Grandchild';
    }
    return 'Primary Account';
  }

  // 5. Both Current and Target are dependents of the same primary root account
  if (currentRootId && currentRootId === targetRootId) {
    // Both are children of primary -> siblings to each other
    if (
      (currentRel.includes('child') || currentRel.includes('son') || currentRel.includes('daughter')) &&
      (targetRel.includes('child') || targetRel.includes('son') || targetRel.includes('daughter'))
    ) {
      return target.gender === 'FEMALE' ? 'Sister' : target.gender === 'MALE' ? 'Brother' : 'Sibling';
    }

    // Both are siblings of root -> siblings to each other
    if (
      (currentRel.includes('sibling') || currentRel.includes('brother') || currentRel.includes('sister')) &&
      (targetRel.includes('sibling') || targetRel.includes('brother') || targetRel.includes('sister'))
    ) {
      return target.gender === 'FEMALE' ? 'Sister' : target.gender === 'MALE' ? 'Brother' : 'Sibling';
    }

    // Current is child of root, target is sibling of root -> Uncle / Aunt
    if (
      (currentRel.includes('child') || currentRel.includes('son') || currentRel.includes('daughter')) &&
      (targetRel.includes('sibling') || targetRel.includes('brother') || targetRel.includes('sister'))
    ) {
      return target.gender === 'FEMALE' ? 'Aunt' : target.gender === 'MALE' ? 'Uncle' : 'Relative';
    }

    // Current is sibling of root, target is child of root -> Nephew / Niece
    if (
      (currentRel.includes('sibling') || currentRel.includes('brother') || currentRel.includes('sister')) &&
      (targetRel.includes('child') || targetRel.includes('son') || targetRel.includes('daughter'))
    ) {
      return target.gender === 'FEMALE' ? 'Niece' : target.gender === 'MALE' ? 'Nephew' : 'Relative';
    }

    // Current is child of root, target is spouse of root -> Mother / Father / Stepparent
    if (
      (currentRel.includes('child') || currentRel.includes('son') || currentRel.includes('daughter')) &&
      (targetRel.includes('spouse') || targetRel.includes('wife') || targetRel.includes('husband'))
    ) {
      return target.gender === 'FEMALE' ? 'Mother' : target.gender === 'MALE' ? 'Father' : 'Parent';
    }

    // Current is spouse of root, target is child of root -> Son / Daughter / Child
    if (
      (currentRel.includes('spouse') || currentRel.includes('wife') || currentRel.includes('husband')) &&
      (targetRel.includes('child') || targetRel.includes('son') || targetRel.includes('daughter'))
    ) {
      return target.gender === 'FEMALE' ? 'Daughter' : target.gender === 'MALE' ? 'Son' : 'Child';
    }

    if (target.rawRelationType && target.rawRelationType !== 'Self' && target.rawRelationType !== 'Current') {
      return target.rawRelationType;
    }
    if (target.relationType && target.relationType !== 'Self' && target.relationType !== 'Current') {
      return target.relationType;
    }
    return 'Family';
  }

  // 6. Fallback: if target has explicit relationType other than 'Self' or 'Current'
  if (target.rawRelationType && target.rawRelationType !== 'Self' && target.rawRelationType !== 'Current') {
    return target.rawRelationType;
  }
  if (target.relationType && target.relationType !== 'Self' && target.relationType !== 'Current') {
    return target.relationType;
  }

  return 'Family';
}

