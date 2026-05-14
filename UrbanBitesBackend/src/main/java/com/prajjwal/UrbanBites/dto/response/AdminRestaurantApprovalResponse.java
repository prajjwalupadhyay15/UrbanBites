package com.prajjwal.UrbanBites.dto.response;

import java.time.OffsetDateTime;
import com.prajjwal.UrbanBites.enums.ApprovalStatus;

public record AdminRestaurantApprovalResponse(
        Long restaurantId,
        String name,
        String city,
        Long ownerId,
        String ownerEmail,
        ApprovalStatus approvalStatus,
        String approvalRejectionReason,
        OffsetDateTime createdAt
) {
}

