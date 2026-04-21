package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.TrackingLocationPingRequest;
import com.prajjwal.UrbanBites.dto.response.TrackingPointResponse;
import com.prajjwal.UrbanBites.dto.response.TrackingSnapshotResponse;
import com.prajjwal.UrbanBites.service.TrackingService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tracking")
public class TrackingController {

    private final TrackingService trackingService;

    public TrackingController(TrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @PostMapping("/orders/{orderId}/ping")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<TrackingSnapshotResponse> ingestPing(
            Principal principal,
            @PathVariable Long orderId,
            @Valid @RequestBody TrackingLocationPingRequest request
    ) {
        return ResponseEntity.ok(trackingService.ingestLocationPing(principal.getName(), orderId, request));
    }

    @GetMapping("/orders/{orderId}/snapshot")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TrackingSnapshotResponse> getLatestSnapshot(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(trackingService.getLatestSnapshot(principal.getName(), orderId));
    }

    @GetMapping("/orders/{orderId}/timeline")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TrackingPointResponse>> getTimeline(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(trackingService.getTimeline(principal.getName(), orderId));
    }

}
