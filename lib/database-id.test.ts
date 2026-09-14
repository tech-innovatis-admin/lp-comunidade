import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDatabaseId } from './database-id';

test('normaliza BIGINT string positivo para number', () => {
  assert.equal(parseDatabaseId('42'), 42);
  assert.equal(parseDatabaseId('9007199254740991'), Number.MAX_SAFE_INTEGER);
});

test('preserva inteiro positivo seguro', () => {
  assert.equal(parseDatabaseId(42), 42);
  assert.equal(parseDatabaseId(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
});

test('rejeita zero, negativo, decimal, texto e valor acima de MAX_SAFE_INTEGER', () => {
  const invalidValues = [
    0,
    -1,
    1.5,
    '0',
    '-1',
    '1.5',
    'abc',
    '',
    ' 42 ',
    Number.MAX_SAFE_INTEGER + 1,
    '9007199254740992',
    null,
    undefined,
  ];

  for (const value of invalidValues) {
    assert.equal(parseDatabaseId(value), null, `${String(value)} deveria ser rejeitado`);
  }
});

test('IDs normalizados comparam propriedade sem coerção frouxa', () => {
  const tokenRegistrationId = 123;
  const databaseRegistrationId = parseDatabaseId('123');
  const unsafeDatabaseRegistrationId = parseDatabaseId('9007199254740992');

  assert.equal(databaseRegistrationId, tokenRegistrationId);
  assert.notEqual('123', tokenRegistrationId);
  assert.equal(unsafeDatabaseRegistrationId, null);
  assert.notEqual(unsafeDatabaseRegistrationId, tokenRegistrationId);
});
