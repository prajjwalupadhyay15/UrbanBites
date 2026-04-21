package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.Role;

public record AuthResponse(
        Long userId,
        String accessToken,
        String refreshToken,
        String tokenType,
        String email,
        String fullName,
        Role role,
        boolean loggedIn
) {
}

