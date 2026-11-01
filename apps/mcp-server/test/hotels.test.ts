import assert from 'node:assert/strict';
import test from 'node:test';
import { findHotels, findHotelsInputSchema, findHotelsResultSchema } from '../src/hotels';

test('returns a complete hotel widget payload and public image URLs', () => {
  const input = findHotelsInputSchema.parse({ city: ' Vienna ' });
  const result = findHotelsResultSchema.parse(findHotels(input));
  assert.equal(result.city, 'Vienna');
  assert.equal(new Set(result.hotels.map((hotel) => hotel.id)).size, 3);
  assert.ok(
    result.hotels.every(
      (hotel) => hotel.name.endsWith('Vienna') && hotel.imageUrl.endsWith('.svg'),
    ),
  );
});

test('rejects an empty city at the MCP boundary', () => {
  assert.equal(findHotelsInputSchema.safeParse({ city: ' ' }).success, false);
});
