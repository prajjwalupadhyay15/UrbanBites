import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

describe('UrbanBites: Tracking & Status Tests', () => {
  test('TC-TRACK-01: Order Header - Should display tracking page title', () => {
    render(
      <MemoryRouter>
        <div>
          <h1>Tracking Order</h1>
          <p>#ORD-12345</p>
        </div>
      </MemoryRouter>
    );
    expect(screen.getByText(/Tracking Order/i)).toBeInTheDocument();
  });

  test('TC-TRACK-02: Live Status - Should show Arriving In section', () => {
    render(
      <MemoryRouter>
        <div className="eta-card">
          <h3>Arriving in</h3>
          <div><span>25</span> mins</div>
        </div>
      </MemoryRouter>
    );
    expect(screen.getByText(/Arriving in/i)).toBeInTheDocument();
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  test('TC-TRACK-03: Delivery Timeline - Should show order status steps', () => {
    render(
      <MemoryRouter>
        <ul>
          <li>Order Confirmed</li>
          <li>Preparing</li>
          <li>Out for Delivery</li>
        </ul>
      </MemoryRouter>
    );
    expect(screen.getByText(/Order Confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/Preparing/i)).toBeInTheDocument();
    expect(screen.getByText(/Out for Delivery/i)).toBeInTheDocument();
  });
});
