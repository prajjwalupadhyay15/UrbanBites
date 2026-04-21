package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.Size;

public record AdminSetPayoutBlockRequest(
        boolean blocked,
        @Size(max = 255) String reason
) {
}

