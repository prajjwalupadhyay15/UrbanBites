package com.prajjwal.UrbanBites.dto.response;

public record DispatchMetricsResponse(
        long offeredCount,
        long acceptedCount,
        long pickedUpCount,
        long deliveredCount,
        long rejectedCount,
        long timedOutCount,
        long reassignedCount,
        long noAgentCount,
        double acceptanceRate
) {
}

