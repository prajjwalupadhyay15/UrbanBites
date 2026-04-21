package com.prajjwal.UrbanBites.dto.response;

public record AgentAvailabilityResponse(
        Long agentUserId,
        boolean online,
        boolean available,
        int currentLoad
) {
}

