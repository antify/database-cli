import test from 'node:test';
import assert from 'node:assert/strict';
import jiti from 'jiti';

const load = jiti(import.meta.url, {interopDefault: true});
const {decideConfirmation, maskDatabaseUrl, getDatabaseNameFromUrl, getTenantDatabaseName} = load('../src/cli/utils/confirm.ts');

test('--yes always proceeds', () => {
  assert.equal(decideConfirmation({yes: true, isTTY: false}), 'proceed');
  assert.equal(decideConfirmation({yes: true, isTTY: true}), 'proceed');
});

test('no TTY and no --yes refuses', () => {
  assert.equal(decideConfirmation({yes: false, isTTY: false}), 'refuse-non-interactive');
  assert.equal(decideConfirmation({yes: false, isTTY: false, answer: 'y'}), 'refuse-non-interactive');
});

test('TTY asks first, only explicit yes proceeds', () => {
  assert.equal(decideConfirmation({yes: false, isTTY: true}), 'ask');
  for (const a of ['y', 'Y', 'yes', ' YES ']) {
    assert.equal(decideConfirmation({yes: false, isTTY: true, answer: a}), 'proceed');
  }
  for (const a of ['', 'n', 'no', 'maybe', 'yy']) {
    assert.equal(decideConfirmation({yes: false, isTTY: true, answer: a}), 'declined');
  }
});

test('maskDatabaseUrl drops credentials, path and query', () => {
  assert.equal(maskDatabaseUrl('mongodb://user:s3cret@db.example.com:27017/core?authSource=admin'), 'mongodb://db.example.com:27017');
  assert.equal(maskDatabaseUrl('mongodb+srv://user:p%40ss@cluster0.example.net/x'), 'mongodb+srv://cluster0.example.net');
  assert.equal(maskDatabaseUrl('mongodb://u:p@h1:1,h2:2/db'), 'mongodb://h1:1,h2:2');
  assert.equal(maskDatabaseUrl('mongodb://127.0.0.1:27099/core'), 'mongodb://127.0.0.1:27099');
  assert.equal(maskDatabaseUrl('garbage'), '<unparsable url>');
});

test('maskDatabaseUrl never prints parts of a password with special characters', () => {
  for (const pw of ['pa/ss', 'pa?ss', 'pa#ss', 'pa@ss', 'p/a?s#s@x']) {
    const out = maskDatabaseUrl(`mongodb://u:${pw}@h:27017/db`);

    assert.equal(out, 'mongodb://h:27017');
    assert.ok(!out.includes('pa'));
  }

  assert.equal(maskDatabaseUrl('mongodb://u:pa/ss@h/db'), 'mongodb://h');
});

test('maskDatabaseUrl without credentials, with several hosts and srv', () => {
  assert.equal(maskDatabaseUrl('mongodb://h1:1,h2:2,h3:3/db?replicaSet=rs'), 'mongodb://h1:1,h2:2,h3:3');
  assert.equal(maskDatabaseUrl('mongodb+srv://u:pa/ss@cluster0.example.net/db?x=1'), 'mongodb+srv://cluster0.example.net');
  assert.equal(maskDatabaseUrl('mongodb://h'), 'mongodb://h');
  assert.equal(maskDatabaseUrl('mongodb://u:pw@'), '<unparsable url>');
  assert.equal(maskDatabaseUrl('mongodb://u:pw@/db'), '<unparsable url>');
  assert.equal(maskDatabaseUrl(''), '<unparsable url>');
});

test('getDatabaseNameFromUrl returns the real database name without credentials', () => {
  assert.equal(getDatabaseNameFromUrl('mongodb://u:pa/ss@h:1/reviewcore?authSource=admin'), 'reviewcore');
  assert.equal(getDatabaseNameFromUrl('mongodb://u:p%2Fx@h/core'), 'core');
  assert.equal(getDatabaseNameFromUrl('mongodb://h:1'), null);
  assert.equal(getDatabaseNameFromUrl('mongodb://h:1/?a=b'), null);
  assert.equal(getDatabaseNameFromUrl('garbage'), null);
});

test('getTenantDatabaseName uses the prefix like the core client', () => {
  assert.equal(getTenantDatabaseName({}, 't1'), 'tenant_t1');
  assert.equal(getTenantDatabaseName({databasePrefix: 'review'}, 't1'), 'reviewt1');
});
