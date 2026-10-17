import type { Href, useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/** Back when there is a screen to go back to (not after a deep link), else replace with `fallback`. */
export function goBackOr(router: AppRouter, fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
