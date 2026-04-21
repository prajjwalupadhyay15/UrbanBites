package com.prajjwal.UrbanBites.dto.request;

import com.prajjwal.UrbanBites.enums.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PhoneOtpRequest(
        @NotBlank String phone,
        @NotNull OtpPurpose purpose
) {
}

