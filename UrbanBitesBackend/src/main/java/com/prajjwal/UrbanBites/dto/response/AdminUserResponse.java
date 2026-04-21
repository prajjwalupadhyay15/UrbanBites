package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.Role;
import java.time.OffsetDateTime;

public record AdminUserResponse(
        Long id,
        String email,
        String fullName,
        Role role,
        boolean enabled,
        boolean emailVerified,
        boolean phoneVerified,
        OffsetDateTime createdAt
) {
}

