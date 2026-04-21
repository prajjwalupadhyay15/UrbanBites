package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.ApprovalStatus;
import com.prajjwal.UrbanBites.enums.Role;
import java.time.OffsetDateTime;

public record AdminPartnerApprovalResponse(
        Long userId,
        String email,
        String fullName,
        Role role,
        ApprovalStatus approvalStatus,
        String approvalRejectionReason,
        OffsetDateTime createdAt
) {
}

