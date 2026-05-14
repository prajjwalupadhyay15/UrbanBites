import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import { describe, test, expect } from 'vitest';

describe('UrbanBites Frontend: Unit Tests', () => {
  test('TC-UI-01: Brand Visibility - Should render "UrbanBites" in the footer', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    const brandElements = screen.getAllByText(/UrbanBites/i);
    expect(brandElements.length).toBeGreaterThan(0);
  });

  test('TC-UI-02: Contact Information - Should display support email', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByText(/support@urbanbites.in/i)).toBeInTheDocument();
  });

  test('TC-UI-03: Dynamic Date - Should display current year in copyright', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });
});
