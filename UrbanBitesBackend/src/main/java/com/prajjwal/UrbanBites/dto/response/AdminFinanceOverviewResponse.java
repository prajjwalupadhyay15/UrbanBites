package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record AdminFinanceOverviewResponse(
        BigDecimal capturedPayments,
        BigDecimal refundedAmount,
        BigDecimal netCashIn,
        BigDecimal orderSubtotalTotal,
        BigDecimal packingChargeTotal,
        BigDecimal taxTotal,
        BigDecimal platformFeeTotal,
        BigDecimal deliveryFeeTotal,
        BigDecimal discountTotal,
        BigDecimal estimatedRestaurantEarnings,
        BigDecimal agentPayoutTotal,
        BigDecimal urbanBitesGrossEarnings,
        BigDecimal urbanBitesNetAfterAgentPayout
) {
}

