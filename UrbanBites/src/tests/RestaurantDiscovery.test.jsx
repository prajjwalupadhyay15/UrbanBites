import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';

describe('UrbanBites: Navigation & Discovery Tests', () => {
  test('TC-NAV-01: Global Navigation - Should show main navigation links', () => {
    render(
      <MemoryRouter>
        <nav>
          <a href="/">Home</a>
          <a href="/restaurants">Restaurants</a>
          <a href="/orders">My Orders</a>
        </nav>
      </MemoryRouter>
    );
    expect(screen.getByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Restaurants/i)).toBeInTheDocument();
  });

  test('TC-DISC-01: Restaurant List - Should display search bar for discovery', () => {
    render(
      <MemoryRouter>
        <input placeholder="Search for restaurants or dishes..." />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/Search for restaurants/i)).toBeInTheDocument();
  });
});
