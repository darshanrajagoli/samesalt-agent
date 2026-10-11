import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { standardizeStrength, parseSaltComposition, keyFor, isNti, describeKey } from '../worker/src/normalize.js';

test('strength normalisation: same amount, different notation -> same string', () => {
  assert.equal(standardizeStrength('650mg'), '650mg');
  assert.equal(standardizeStrength('650 mg'), '650mg');
  assert.equal(standardizeStrength('650 MG'), '650mg');
  assert.equal(standardizeStrength('0.65 g'), '650mg');
  assert.equal(standardizeStrength('0.65g'), '650mg');
  assert.equal(standardizeStrength('1gm'), '1000mg');
  assert.equal(standardizeStrength('250mcg'), '0.25mg');
  assert.equal(standardizeStrength('4.5mcg'), '0.0045mg');
  assert.equal(standardizeStrength('10%'), '10%');
  assert.equal(standardizeStrength('5ml'), '5ml');
  assert.equal(standardizeStrength('60000 IU'), '60000IU');
});

test('650 mg and 0.65 g paracetamol produce the same key', () => {
  const a = keyFor('Paracetamol (650mg)', { name: 'Dolo 650 Tablet' }).key;
  const b = keyFor('Paracetamol IP 0.65 g', { name: 'Some brand Tablet' }).key;
  assert.equal(a, 'paracetamol:650mg|tablet');
  assert.equal(a, b);
});

test('different strength or form never match', () => {
  const k650 = keyFor('Paracetamol (650mg)', { name: 'X Tablet' }).key;
  assert.notEqual(k650, keyFor('Paracetamol (500mg)', { name: 'X Tablet' }).key);
  assert.notEqual(k650, keyFor('Paracetamol (650mg)', { name: 'X Suspension' }).key);
  assert.notEqual(k650, keyFor('Paracetamol (650mg)', { name: 'X Capsule' }).key);
});

test('release type is part of the key (SR never matches plain)', () => {
  const plain = keyFor('Metformin (500mg)', { name: 'Glycomet 500 Tablet' }).key;
  const sr = keyFor('Metformin (500mg)', { name: 'Glycomet 500 SR Tablet' }).key;
  assert.equal(plain, 'metformin:500mg|tablet');
  assert.equal(sr, 'metformin:500mg|tablet|SR');
  assert.notEqual(plain, sr);
});

test('multi-salt combos: order-independent, spelling-normalised, all strengths must match', () => {
  const a = keyFor('Amoxycillin (500mg) + Clavulanic Acid (125mg)', { name: 'Augmentin 625 Duo Tablet' }).key;
  const b = keyFor('Clavulanic Acid (125mg) + Amoxicillin (500mg)', { name: 'Generic Tablet' }).key;
  const c = keyFor('Amoxicillin (875mg) + Clavulanic Acid (125mg)', { name: 'Augmentin 1000 Duo Tablet' }).key;
  assert.equal(a, 'amoxicillin:500mg+clavulanic acid:125mg|tablet');
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('a combination never matches one of its parts', () => {
  const combo = keyFor('Paracetamol (650mg) + Caffeine (50mg)', { name: 'Crocin Pain Relief Tablet' }).key;
  const single = keyFor('Paracetamol (650mg)', { name: 'Dolo 650 Tablet' }).key;
  assert.equal(combo, 'caffeine:50mg+paracetamol:650mg|tablet');
  assert.notEqual(combo, single);
});

test('trailing-strength and IP/BP suffix formats parse', () => {
  assert.deepEqual(parseSaltComposition('Paracetamol IP 500mg + Caffeine 65mg'), [['caffeine', '65mg'], ['paracetamol', '500mg']]);
  assert.deepEqual(parseSaltComposition('Metformin Hydrochloride IP 500mg'), [['metformin hydrochloride', '500mg']]);
  assert.deepEqual(parseSaltComposition('NA'), []);
});

test('narrow-therapeutic-index salts are flagged', () => {
  assert.equal(isNti(parseSaltComposition('Warfarin (5mg)')), true);
  assert.equal(isNti(parseSaltComposition('Thyroxine Sodium (50mcg)')), true);
  assert.equal(isNti(parseSaltComposition('Paracetamol (650mg)')), false);
});

test('describeKey is human readable', () => {
  assert.equal(describeKey('paracetamol:650mg|tablet'), 'Paracetamol 650 mg · tablet');
  assert.equal(describeKey('amoxicillin:500mg+clavulanic acid:125mg|tablet'), 'Amoxicillin 500 mg + Clavulanic Acid 125 mg · tablet');
});

test('parity with the 246k-row database: JS keys == Python pipeline keys on a 2,000-row random sample', () => {
  const rows = JSON.parse(readFileSync(new URL('./fixtures/db_sample.json', import.meta.url), 'utf8'));
  let same = 0;
  const diffs = [];
  for (const [name, salt, key] of rows) {
    const k = keyFor(salt, { name }).key;
    if (k === key) same += 1;
    else if (diffs.length < 5) diffs.push({ name, salt, py: key, js: k });
  }
  const rate = same / rows.length;
  console.log(`  key parity: ${same}/${rows.length} (${(rate * 100).toFixed(2)}%)`, diffs.length ? diffs : '');
  assert.ok(rate >= 0.995, `parity ${rate}`);
});
