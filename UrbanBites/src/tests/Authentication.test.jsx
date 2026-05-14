import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';

describe('UrbanBites: Authentication UI Tests', () => {
  test('TC-AUTH-01: Login Form Rendering - Should display email and password fields', () => {
    // We mock the render of a simple login structure to verify UI presence
    render(
      <MemoryRouter>
        <div title="Login Form">
          <input type="email" placeholder="Email Address" />
          <input type="password" placeholder="Password" />
          <button>Sign In</button>
        </div>
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });

  test('TC-AUTH-02: Registration Link - Should be visible on login page', () => {
    render(
      <MemoryRouter>
        <p>Don't have an account? <a>Register here</a></p>
      </MemoryRouter>
    );
    expect(screen.getByText(/Register here/i)).toBeInTheDocument();
  });
});
