package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.ApprovalStatus;
import com.prajjwal.UrbanBites.enums.Role;

public record UserProfileResponse(
        Long id,
        String email,
        String fullName,
        Role role,
        String phone,
        String gender,
        String profilePictureUrl,
        boolean phoneVerified,
        boolean emailVerified,
        ApprovalStatus approvalStatus
) {
}

