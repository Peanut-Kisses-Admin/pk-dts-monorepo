import { of, lastValueFrom } from 'rxjs';
import { BigIntInterceptor } from './big-int.interceptor';

describe('BigIntInterceptor', () => {
  it('serializes nested BigInt values to strings', async () => {
    const interceptor = new BigIntInterceptor();
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () =>
          of({
            id: 1n,
            revisions: [{ revision_id: 2n }],
          }),
      }),
    );

    expect(result).toEqual({
      id: '1',
      revisions: [{ revision_id: '2' }],
    });
  });
});
