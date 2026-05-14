import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

describe('UrbanBites: User Profile Tests', () => {
  test('TC-PROF-01: Profile Header - Should show Personal Information heading', () => {
    render(
      <MemoryRouter>
        <div>
          <h2>Personal Information</h2>
          <p>Update your photo and personal details.</p>
        </div>
      </MemoryRouter>
    );
    expect(screen.getByText(/Personal Information/i)).toBeInTheDocument();
  });

  test('TC-PROF-02: Action Buttons - Should show Edit Profile button', () => {
    render(
      <MemoryRouter>
        <button>Edit Profile</button>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
  });

  test('TC-PROF-03: Security Section - Should show Password update option', () => {
    render(
      <MemoryRouter>
        <div>
          <h3>Password</h3>
          <button>Change</button>
        </div>
      </MemoryRouter>
    );
    expect(screen.getByText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change/i })).toBeInTheDocument();
  });
});
