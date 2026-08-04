import type { PoolClient } from 'pg';

const PROTOCOL_TIMEZONE = 'America/Fortaleza';

export function getEditalProtocolYear(now: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PROTOCOL_TIMEZONE,
    year: 'numeric',
  });

  return parseInt(formatter.format(now), 10);
}

export function formatEditalProtocolNumber(year: number, sequence: number): string {
  return `${year}${String(sequence).padStart(4, '0')}`;
}

export async function allocateEditalProtocolNumber(client: PoolClient): Promise<string> {
  const year = getEditalProtocolYear();

  const result = await client.query<{ last_value: number }>(
    `
      INSERT INTO edital_protocol_sequences (year, last_value)
      VALUES ($1, 1)
      ON CONFLICT (year) DO UPDATE
        SET last_value = edital_protocol_sequences.last_value + 1
      RETURNING last_value
    `,
    [year]
  );

  const sequence = result.rows[0].last_value;
  return formatEditalProtocolNumber(year, sequence);
}
