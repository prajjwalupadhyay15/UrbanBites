package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TrackingSnapshotResponse(
                Long orderId,
                Long agentUserId,
                String agentName,
                String agentPhone,
                BigDecimal latitude,
                BigDecimal longitude,
                BigDecimal restaurantLatitude,
                BigDecimal restaurantLongitude,
                BigDecimal deliveryLatitude,
                BigDecimal deliveryLongitude,
                Integer etaMinutes,
                OrderStatus orderStatus,
                OffsetDateTime capturedAt) {
}
