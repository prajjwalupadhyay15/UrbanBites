package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record EmailOtpVerifyRequest(
		@NotBlank @Pattern(regexp = "\\d{6}") String otp
) {
}

