package com.prajjwal.UrbanBites.dto.request;

import com.prajjwal.UrbanBites.enums.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record PhoneOtpVerifyRequest(
        @NotBlank String phone,
        @NotNull OtpPurpose purpose,
        @NotBlank @Pattern(regexp = "\\d{6}") String otp
) {
}

