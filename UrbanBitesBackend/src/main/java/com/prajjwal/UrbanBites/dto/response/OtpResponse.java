package com.prajjwal.UrbanBites.dto.response;

import java.time.OffsetDateTime;

public record OtpResponse(
        String message,
        String otp,
        OffsetDateTime expiresAt
) {
}

