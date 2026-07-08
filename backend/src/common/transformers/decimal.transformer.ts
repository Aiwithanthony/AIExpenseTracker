import { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL returns `decimal`/`numeric` columns as strings (the `pg` driver
 * does this to avoid float precision loss). Without a transformer, JS arithmetic
 * silently string-concatenates — e.g. `'100.00' + 50 === '100.0050'` — corrupting
 * wallet balances, budget totals, and challenge progress.
 *
 * This transformer parses stored values to numbers on read and passes numbers
 * straight through on write. Null/undefined are preserved for nullable columns.
 */
export const DecimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | number | null): number | null | undefined => {
    if (value === null || value === undefined) {
      return value as null | undefined;
    }
    return typeof value === 'number' ? value : parseFloat(value);
  },
};
