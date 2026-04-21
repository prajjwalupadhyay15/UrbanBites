package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.NotificationType;
import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String message,
        String referenceLabel,
        OffsetDateTime createdAt,
        OffsetDateTime readAt
) {
}

