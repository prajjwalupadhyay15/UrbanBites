package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AdminCreateCouponCampaignRequest(
        @NotBlank @Size(max = 80) String code,
        @NotBlank @Size(max = 255) String description,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal discountPercent,
        Integer maxUses,
        @NotNull OffsetDateTime startsAt,
        @NotNull OffsetDateTime endsAt,
        boolean active
) {
}

