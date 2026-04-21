package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.AdminDisputeStatus;
import com.prajjwal.UrbanBites.enums.AdminDisputeType;
import java.time.OffsetDateTime;

public record AdminDisputeCaseResponse(
        Long id,
        Long orderId,
        AdminDisputeType type,
        AdminDisputeStatus status,
        String title,
        String description,
        String resolutionNote,
        String createdBy,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt
) {
}

