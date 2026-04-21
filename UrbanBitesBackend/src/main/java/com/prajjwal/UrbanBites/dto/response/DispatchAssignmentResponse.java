package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import java.time.OffsetDateTime;

public record DispatchAssignmentResponse(
        Long assignmentId,
        Long orderId,
        Long agentUserId,
        String agentName,
        DispatchAssignmentStatus status,
        int attemptNumber,
        OffsetDateTime offerExpiresAt
) {
}

