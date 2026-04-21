package com.prajjwal.UrbanBites.dto.request;

import com.prajjwal.UrbanBites.enums.AdminDisputeStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminUpdateDisputeStatusRequest(
        @NotNull AdminDisputeStatus status,
        @Size(max = 1200) String resolutionNote
) {
}

