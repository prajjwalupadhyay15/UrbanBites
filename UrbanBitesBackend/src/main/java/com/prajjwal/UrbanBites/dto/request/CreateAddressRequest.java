package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateAddressRequest(
        @NotBlank @Size(max = 120) String label,
        @NotBlank @Size(max = 255) String line1,
        @Size(max = 255) String line2,
        @NotBlank @Size(max = 120) String city,
        @NotBlank @Size(max = 120) String state,
        @NotBlank @Size(max = 20) @Pattern(regexp = "^[0-9A-Za-z\\- ]{4,20}$") String pincode,
        @Size(max = 255) String landmark,
        @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") BigDecimal latitude,
        @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") BigDecimal longitude,
        @NotBlank @Size(max = 120) String contactName,
        @NotBlank @Size(max = 20) String contactPhone,
        boolean isDefault
) {
}

