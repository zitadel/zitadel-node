import { ApiException } from '../src/api-exception.js';

describe('ApiExceptionTest', () => {
  test('testApiException', () => {
    const e = new ApiException('Error 418', 418, { H: ['v'] }, 'body');
    expect(e.message).toBe('Error 418');
    expect(e.getStatusCode()).toBe(418);
    expect(e.getResponseHeaders()).toEqual({ H: ['v'] });
    expect(e.getResponseBody()).toBe('body');
  });
});
