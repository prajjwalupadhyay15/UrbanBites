package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ApplyCouponRequest(
        @NotBlank(message = "Coupon code is required")
        String couponCode
) {}
