// The ratings game renders with mocked data and reveals its insight sections.
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { FuturesGameEmbed } from './FuturesRadar';

const mkRec = i => ({
  Index: i,
  createdAt: '2025-12-08T10:00:00.000Z',
  birth_year: 1998 + (i % 10),
  gender: i % 2 ? 'Female' : 'Male',
  nationality: 'x',
  residence_country: ['Spain', 'Italy', 'Portugal'][i % 3],
  field_of_study: ['Business, Administration, and Law', 'Arts and Humanities (e.g. History)', 'other'][i % 3],
  future_world: 1 + (i % 4), future_europe: 1 + (i % 4),
  future_country: 1 + (i % 4), future_personal: 1 + (i % 4),
  economy: 1 + (i % 6), politics: 1 + (i % 6), culture: 1 + (i % 6),
  security: 1 + (i % 6), ecosystem: 1 + (i % 6), technology: 1 + (i % 6),
});

// plain functions (not jest.fn): CRA's resetMocks would wipe mock implementations
beforeEach(() => {
  global.IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
  window.HTMLElement.prototype.scrollIntoView = () => {};
  global.fetch = () => Promise.resolve({
    json: () => Promise.resolve(Array.from({ length: 18 }, (_, i) => mkRec(i))),
  });
});

test('loads live data, reveals, and mounts every insight section', async () => {
  const { unmount } = render(<FuturesGameEmbed />);

  // compact chapter-2 intro appears once the mocked fetch resolves
  await screen.findByText(/How hopeful do they feel about tomorrow/i);
  expect(screen.getAllByText(/LIVE · 18 RESPONSES/i).length).toBeGreaterThan(0);

  // the game is on the page
  expect(screen.getByText(/How hopeful are they/i)).toBeInTheDocument();

  // reveal (950 ms staged delay)
  fireEvent.click(screen.getByText(/Reveal the real averages/i));
  await screen.findByText(/Measured against 18 live answers/i, {}, { timeout: 4000 });

  expect(screen.getByText(/What the data says · 1 of 3/i)).toBeInTheDocument();
  expect(screen.getByText(/What the data says · 2 of 3/i)).toBeInTheDocument();
  expect(screen.getByText(/The people behind the dots/i)).toBeInTheDocument();
  expect(screen.queryByText(/The geography of hope/i)).not.toBeInTheDocument();

  // this survey's own About modal (distinct from the tinder page's own About modal)
  fireEvent.click(screen.getByText(/About this survey/i));
  await screen.findByText(/A different, shorter RELISH survey/i);

  unmount();
});
