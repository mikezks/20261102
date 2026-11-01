import assert from 'node:assert/strict';
import test from 'node:test';
import { addBooking, isBooked, removeBooking } from '../src/mastra/data/booked-flights-store';
import { bookFlightTool } from '../src/mastra/tools/book-flight';
import { cancelFlightTool } from '../src/mastra/tools/cancel-flight';

test('requires approval, respects decline and applies each approved demo mutation once', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      id: 901,
      from: 'Graz',
      to: 'Hamburg',
      date: '2026-11-12T08:00:00Z',
      delayed: false,
    });
  try {
    const book = bookFlightTool.execute;
    const cancel = cancelFlightTool.execute;
    assert.ok(book);
    assert.ok(cancel);
    let suspended: unknown;
    const context = {
      agent: {
        suspend: async (payload: unknown) => {
          suspended = payload;
        },
      },
    };
    await book({ flightId: 901 }, context as unknown as Parameters<typeof book>[1]);
    assert.ok(suspended);
    assert.equal(isBooked(901), false);
    await book({ flightId: 901 }, {
      agent: { resumeData: { selection: 'creditCard' } },
    } as Parameters<typeof book>[1]);
    assert.equal(isBooked(901), true);
    const duplicate = await book(
      { flightId: 901 },
      context as unknown as Parameters<typeof book>[1],
    );
    assert.equal(duplicate && 'code' in duplicate ? duplicate.code : '', 'ALREADY_BOOKED');
    await cancel({ flightId: 901 }, { agent: { resumeData: { approved: false } } } as Parameters<
      typeof cancel
    >[1]);
    assert.equal(isBooked(901), true);
    await cancel({ flightId: 901 }, { agent: { resumeData: { approved: true } } } as Parameters<
      typeof cancel
    >[1]);
    assert.equal(isBooked(901), false);
  } finally {
    globalThis.fetch = original;
    removeBooking(901);
  }
});

test('a failed backend lookup does not cancel the booking', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  addBooking(902);
  try {
    const cancel = cancelFlightTool.execute;
    assert.ok(cancel);
    const result = await cancel({ flightId: 902 }, {
      agent: { resumeData: { approved: true } },
    } as Parameters<typeof cancel>[1]);
    assert.equal(result && 'code' in result ? result.code : '', 'LOAD_FAILED');
    assert.equal(isBooked(902), true);
  } finally {
    globalThis.fetch = original;
    removeBooking(902);
  }
});
