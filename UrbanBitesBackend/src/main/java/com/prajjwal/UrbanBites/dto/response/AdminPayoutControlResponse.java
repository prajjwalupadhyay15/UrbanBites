package com.prajjwal.UrbanBites.dto.response;

import java.time.OffsetDateTime;

public record AdminPayoutControlResponse(
        Long restaurantId,
        String restaurantName,
        boolean blocked,
        String reason,
        String updatedBy,
        OffsetDateTime updatedAt
) {
}

