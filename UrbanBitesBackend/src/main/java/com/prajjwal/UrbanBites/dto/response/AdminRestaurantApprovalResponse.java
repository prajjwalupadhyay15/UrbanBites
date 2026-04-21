package com.prajjwal.UrbanBites.dto.response;

import java.time.OffsetDateTime;

public record AdminRestaurantApprovalResponse(
        Long restaurantId,
        String name,
        String city,
        Long ownerId,
        String ownerEmail,
        String approvalStatus,
        String approvalRejectionReason,
        OffsetDateTime createdAt
) {
}

