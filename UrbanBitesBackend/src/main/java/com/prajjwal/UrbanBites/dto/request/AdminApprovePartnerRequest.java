package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotNull;

public record AdminApprovePartnerRequest(
        @NotNull(message = "userId is required") Long userId,
        @NotNull(message = "approved is required") Boolean approved,
        String rejectionReason
) {
}

