package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.AdminReviewModerationStatus;
import java.time.OffsetDateTime;

public record AdminReviewModerationResponse(
        Long id,
        String reviewType,
        Long reviewId,
        AdminReviewModerationStatus status,
        String reason,
        String moderatedBy,
        OffsetDateTime createdAt
) {
}

