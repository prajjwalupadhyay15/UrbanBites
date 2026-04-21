package com.prajjwal.UrbanBites.dto.request;

import com.prajjwal.UrbanBites.enums.PackingPolicyType;
import com.prajjwal.UrbanBites.enums.PlatformFeeType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record AdminUpsertPricingRuleRequest(
        @NotBlank @Size(max = 40) String version,
        boolean active,
        @NotNull @DecimalMin("0.00") BigDecimal baseFee,
        @NotNull @DecimalMin("0.00") BigDecimal slabKmCutoff,
        @NotNull @DecimalMin("0.00") BigDecimal slabFee,
        @NotNull @DecimalMin("0.00") BigDecimal perKmRate,
        @NotNull @DecimalMin("1.000") @DecimalMax("5.000") BigDecimal surgePeakMultiplier,
        @NotNull @DecimalMin("1.000") @DecimalMax("5.000") BigDecimal surgeRainMultiplier,
        @NotNull @DecimalMin("0.00") BigDecimal minDeliveryFee,
        @NotNull @DecimalMin("0.00") BigDecimal maxDeliveryFee,
        @DecimalMin("0.00") BigDecimal freeDeliveryThreshold,
        @NotNull PlatformFeeType platformFeeType,
        @NotNull @DecimalMin("0.00") BigDecimal platformFeeValue,
        @NotNull @DecimalMin("0.000") @DecimalMax("100.000") BigDecimal taxPercent,
        @NotNull PackingPolicyType packingPolicy,
        @NotNull @DecimalMin("0.00") BigDecimal packingValue
) {
}

