package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record CouponResponse(
        String code,
        String description,
        BigDecimal discountPercent,
        boolean applied,
        String message
) {}
