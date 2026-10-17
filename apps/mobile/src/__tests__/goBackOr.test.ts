import { goBackOr } from '@/navigation/goBackOr';

function fakeRouter(canGoBack: boolean) {
  return { canGoBack: () => canGoBack, back: jest.fn(), replace: jest.fn() };
}

type AppRouter = Parameters<typeof goBackOr>[0];

describe('goBackOr', () => {
  it('goes back when there is a screen behind', () => {
    const router = fakeRouter(true);
    goBackOr(router as unknown as AppRouter, '/');
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces with the fallback after a deep link', () => {
    const router = fakeRouter(false);
    goBackOr(router as unknown as AppRouter, '/');
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
