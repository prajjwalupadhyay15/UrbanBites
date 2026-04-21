package com.prajjwal.UrbanBites.enums;

/**
 * Approval status for partners (restaurant owners, delivery agents) and restaurants.
 * Separate from enabled/active to track onboarding review workflow.
 */
public enum ApprovalStatus {
    PENDING,      // Awaiting admin review
    APPROVED,     // Admin approved
    REJECTED      // Admin rejected (can re-apply after fixes)
}

