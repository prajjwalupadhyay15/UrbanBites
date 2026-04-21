package com.prajjwal.UrbanBites.dto.request;

import com.prajjwal.UrbanBites.enums.ZoneRuleType;

public record AssignRestaurantZoneRequest(Long serviceZoneId, ZoneRuleType ruleType) {
}

