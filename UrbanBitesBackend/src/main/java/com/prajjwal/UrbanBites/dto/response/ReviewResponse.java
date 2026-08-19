package com.prajjwal.UrbanBites.dto.response;

import java.time.OffsetDateTime;

public record ReviewResponse(
        Long id,
        Long orderId,
        Long restaurantId,
        String restaurantName,
        String reviewerName,
        int rating,
        String comment,
        String ownerReply,
        OffsetDateTime replyAt,
        OffsetDateTime createdAt
) {}
