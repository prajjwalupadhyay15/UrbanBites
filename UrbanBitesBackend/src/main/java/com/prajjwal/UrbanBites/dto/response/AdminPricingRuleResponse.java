package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.PackingPolicyType;
import com.prajjwal.UrbanBites.enums.PlatformFeeType;
import java.math.BigDecimal;

public record AdminPricingRuleResponse(
        Long id,
        String version,
        boolean active,
        BigDecimal baseFee,
        BigDecimal slabKmCutoff,
        BigDecimal slabFee,
        BigDecimal perKmRate,
        BigDecimal surgePeakMultiplier,
        BigDecimal surgeRainMultiplier,
        BigDecimal minDeliveryFee,
        BigDecimal maxDeliveryFee,
        BigDecimal freeDeliveryThreshold,
        PlatformFeeType platformFeeType,
        BigDecimal platformFeeValue,
        BigDecimal taxPercent,
        PackingPolicyType packingPolicy,
        BigDecimal packingValue
) {
}

