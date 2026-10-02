import test from 'node:test';
import assert from 'node:assert/strict';
import jiti from 'jiti';

const load = jiti(import.meta.url, {interopDefault: true});
const {decideConfirmation, maskDatabaseUrl} = load('../src/cli/utils/confirm.ts');

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
