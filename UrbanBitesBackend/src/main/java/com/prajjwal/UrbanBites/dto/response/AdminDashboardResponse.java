package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record AdminDashboardResponse(
        long totalUsers,
        long activeUsers,
        long totalRestaurants,
        long activeRestaurants,
        long totalOrders,
        long deliveredOrders,
        long cancelledOrders,
        BigDecimal capturedRevenue,
        long refundedPayments,
        long openDisputes,
        long payoutsBlockedRestaurants,
        long visibleNoAgentAssignments
) {
}

