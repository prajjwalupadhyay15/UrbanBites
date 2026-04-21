package com.prajjwal.UrbanBites.dto.response;

import java.time.OffsetDateTime;

public record RealtimeEventResponse(
		String eventType,
		Long resourceId,
		OffsetDateTime occurredAt,
		Object snapshot
) {
}


