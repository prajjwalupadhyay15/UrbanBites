package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OwnerReplyRequest(
        @NotBlank(message = "Reply cannot be empty")
        @Size(max = 1000, message = "Reply cannot exceed 1000 characters")
        String reply
) {
}
