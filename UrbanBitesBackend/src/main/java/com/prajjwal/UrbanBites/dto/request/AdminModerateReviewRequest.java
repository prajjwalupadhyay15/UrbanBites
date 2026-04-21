package com.prajjwal.UrbanBites.dto.request;

import com.prajjwal.UrbanBites.enums.AdminReviewModerationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminModerateReviewRequest(
        @NotBlank @Size(max = 40) String reviewType,
        @NotNull Long reviewId,
        @NotNull AdminReviewModerationStatus status,
        @NotBlank @Size(max = 255) String reason
) {
}

