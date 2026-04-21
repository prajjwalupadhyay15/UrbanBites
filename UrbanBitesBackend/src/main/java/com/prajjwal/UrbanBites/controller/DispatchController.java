package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.AgentAvailabilityRequest;
import com.prajjwal.UrbanBites.dto.response.AgentAvailabilityResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchAssignmentResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchEventResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchMetricsResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchSweepResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryFinanceSummaryResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryFinanceTransactionResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryOrderDetailsResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryOrderHistoryResponse;
import com.prajjwal.UrbanBites.service.DispatchService;
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
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/v1/dispatch")
public class DispatchController {

    private final DispatchService dispatchService;

    public DispatchController(DispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    @PostMapping("/agent/availability")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<AgentAvailabilityResponse> updateAvailability(
            Principal principal,
            @Valid @RequestBody AgentAvailabilityRequest request
    ) {
        return ResponseEntity.ok(dispatchService.updateMyAvailability(
                principal.getName(),
                request.online(),
                request.available(),
                request.latitude(),
                request.longitude()
        ));
    }

    @GetMapping("/agent/assignments/current")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<DispatchAssignmentResponse> getCurrentAssignment(Principal principal) {
        return ResponseEntity.ok(dispatchService.getMyCurrentAssignment(principal.getName()));
    }

    @GetMapping("/agent/assignments/current/details")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<DeliveryOrderDetailsResponse> getCurrentAssignmentDetails(Principal principal) {
        return ResponseEntity.ok(dispatchService.getMyCurrentAssignmentDetails(principal.getName()));
    }

    @GetMapping("/agent/orders/history")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<List<DeliveryOrderHistoryResponse>> getMyOrderHistory(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(dispatchService.listMyOrderHistory(principal.getName(), page, size));
    }

    @GetMapping("/agent/finance/summary")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<DeliveryFinanceSummaryResponse> getMyFinanceSummary(Principal principal) {
        return ResponseEntity.ok(dispatchService.myFinanceSummary(principal.getName()));
    }

    @GetMapping("/agent/finance/transactions")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<List<DeliveryFinanceTransactionResponse>> getMyFinanceTransactions(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(dispatchService.myFinanceTransactions(principal.getName(), page, size));
    }

    @PostMapping("/orders/{orderId}/accept")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<DispatchAssignmentResponse> acceptOffer(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(dispatchService.acceptOffer(principal.getName(), orderId));
    }

    @PostMapping("/orders/{orderId}/reject")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<DispatchAssignmentResponse> rejectOffer(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(dispatchService.rejectOffer(principal.getName(), orderId));
    }

    @PostMapping("/orders/{orderId}/pickup")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<DispatchAssignmentResponse> markPickedUp(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(dispatchService.markPickedUp(principal.getName(), orderId));
    }

    @PostMapping("/orders/{orderId}/delivered")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<DispatchAssignmentResponse> markDelivered(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(dispatchService.markDelivered(principal.getName(), orderId));
    }

    @PostMapping("/admin/process-timeouts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DispatchSweepResponse> processTimeouts() {
        return ResponseEntity.ok(new DispatchSweepResponse(dispatchService.processExpiredOffers()));
    }

    @GetMapping("/admin/orders/{orderId}/timeline")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DispatchEventResponse>> getOrderTimeline(@PathVariable Long orderId) {
        return ResponseEntity.ok(dispatchService.getDispatchTimeline(orderId));
    }

    @GetMapping("/admin/no-agent-queue")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DispatchAssignmentResponse>> getNoAgentQueue() {
        return ResponseEntity.ok(dispatchService.getNoAgentQueue());
    }

    @GetMapping("/admin/metrics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DispatchMetricsResponse> getMetrics(@RequestParam(defaultValue = "60") long sinceMinutes) {
        return ResponseEntity.ok(dispatchService.getMetrics(sinceMinutes));
    }
}


