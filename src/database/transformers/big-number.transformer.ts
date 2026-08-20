import BigNumber from 'bignumber.js';
import type { ValueTransformer } from 'typeorm';

export const bigNumberTransformer: ValueTransformer = {
  to(value: BigNumber | null): string | null {
    return value === null ? null : value.toFixed();
  },

  from(value: string | null): BigNumber | null {
    return value === null ? null : new BigNumber(value);
  },
};
