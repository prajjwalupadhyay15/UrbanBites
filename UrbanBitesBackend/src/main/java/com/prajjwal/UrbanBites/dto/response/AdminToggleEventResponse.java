package com.prajjwal.UrbanBites.dto.response;

import java.time.OffsetDateTime;

public record AdminToggleEventResponse(
        String entityType,
        Long entityId,
        String field,
        boolean previousValue,
        boolean newValue,
        String actorEmail,
        OffsetDateTime occurredAt
) {
}

