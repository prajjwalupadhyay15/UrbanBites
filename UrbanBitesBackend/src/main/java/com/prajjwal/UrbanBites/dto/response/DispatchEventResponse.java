package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import java.time.OffsetDateTime;

public record DispatchEventResponse(
        Long assignmentId,
        DispatchAssignmentStatus status,
        String eventNote,
        OffsetDateTime createdAt
) {
}

