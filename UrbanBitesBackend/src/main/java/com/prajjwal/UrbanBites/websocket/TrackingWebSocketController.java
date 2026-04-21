package com.prajjwal.UrbanBites.websocket;

import com.prajjwal.UrbanBites.dto.request.TrackingLocationPingRequest;
import com.prajjwal.UrbanBites.dto.response.TrackingSnapshotResponse;
import com.prajjwal.UrbanBites.service.TrackingService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

@Controller
public class TrackingWebSocketController {

    private final TrackingService trackingService;

    public TrackingWebSocketController(TrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @MessageMapping("/tracking/agent/ping")
    @SendToUser("/queue/tracking/ack")
    public TrackingSnapshotResponse ingestAgentPing(
            Principal principal,
            @Valid @Payload TrackingLocationPingRequest request
    ) {
        return trackingService.ingestLocationPingForActiveAssignment(principal.getName(), request);
    }
}

