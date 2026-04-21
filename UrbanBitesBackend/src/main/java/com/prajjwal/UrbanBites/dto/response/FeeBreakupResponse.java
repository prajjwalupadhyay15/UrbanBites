package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record FeeBreakupResponse(
        String pricingRuleVersion,
        BigDecimal distanceKm,
        BigDecimal surgeMultiplier,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        BigDecimal packingCharge,
        BigDecimal platformFee,
        BigDecimal tax,
        BigDecimal discount,
        BigDecimal grandTotal
) {
}

