import { encodeCursor } from './cursor';
import { pageFetchLimit, toPage } from './to-page';

type Row = { name: string };

const rows = (...names: string[]): Row[] => names.map((name) => ({ name }));

const options = {
  limit: 2,
  cursorOf: (row: Row) => row.name,
  toItem: (row: Row) => row.name.toUpperCase(),
};

describe('pageFetchLimit', () => {
  it('asks for one row more than the page size', () => {
    expect(pageFetchLimit(20)).toBe(21);
  });
});

describe('toPage', () => {
  it('drops the extra row and points the cursor at the last item on the page', () => {
    expect(toPage(rows('alpha', 'bravo', 'charlie'), options)).toEqual({
      items: ['ALPHA', 'BRAVO'],
      nextCursor: encodeCursor('bravo'),
    });
  });

  it('ends the list when exactly a full page comes back', () => {
    expect(toPage(rows('alpha', 'bravo'), options)).toEqual({
      items: ['ALPHA', 'BRAVO'],
      nextCursor: null,
    });
  });

  it('ends the list on a short page', () => {
    expect(toPage(rows('alpha'), options)).toEqual({ items: ['ALPHA'], nextCursor: null });
  });

  it('returns an empty page with no cursor', () => {
    expect(toPage([], options)).toEqual({ items: [], nextCursor: null });
  });

  it('maps only the rows on the page', () => {
    const toItem = jest.fn((row: Row) => row.name);
    toPage(rows('alpha', 'bravo', 'charlie'), { ...options, toItem });
    expect(toItem).toHaveBeenCalledTimes(2);
  });
});
