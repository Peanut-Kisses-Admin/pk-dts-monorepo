import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  it('wraps responses in the API envelope', async () => {
    const interceptor = new ResponseInterceptor();
    const result = await lastValueFrom(
      interceptor.intercept(
        {
          switchToHttp: () => ({
            getRequest: () => ({ originalUrl: '/api/v1/health' }),
            getResponse: () => ({ getHeader: () => undefined }),
          }),
        } as never,
        {
          handle: () => of({ status: 'ok' }),
        },
      ),
    );

    expect(result).toMatchObject({
      success: true,
      path: '/api/v1/health',
      data: { status: 'ok' },
    });
    expect(result).toHaveProperty('timestamp');
  });
});
