package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record AnalyticsResponse(
        BigDecimal totalRevenue,
        int totalOrders,
        List<DailyRevenue> revenueTimeline,
        List<TopMenuItem> topItems
) {
    public record DailyRevenue(String date, BigDecimal revenue, int orders) {}
    public record TopMenuItem(String name, int quantitySold, BigDecimal revenue) {}
}
