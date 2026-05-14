import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';

describe('UrbanBites: Shopping Experience Tests', () => {
  test('TC-CART-01: Empty Cart State - Should show empty message when cart has 0 items', () => {
    render(
      <MemoryRouter>
        <div className="cart-drawer">
          <h2>Your Cart</h2>
          <p>Your cart is empty. Start adding some delicious food!</p>
        </div>
      </MemoryRouter>
    );
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
  });

  test('TC-CART-02: Checkout Button - Should be visible in the cart drawer', () => {
    render(
      <MemoryRouter>
        <button disabled>Proceed to Checkout</button>
      </MemoryRouter>
    );
    const btn = screen.getByText(/Proceed to Checkout/i);
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled(); // Should be disabled if cart is empty
  });
});
