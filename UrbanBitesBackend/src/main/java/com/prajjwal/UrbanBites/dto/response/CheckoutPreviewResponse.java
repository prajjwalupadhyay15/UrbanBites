package com.prajjwal.UrbanBites.dto.response;

public record CheckoutPreviewResponse(
        CartResponse cart,
        FeeBreakupResponse fees,
        boolean serviceable,
        String serviceabilityReason
) {
}

