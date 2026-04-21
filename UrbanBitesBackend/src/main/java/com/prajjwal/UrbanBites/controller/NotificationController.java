package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.response.NotificationResponse;
import com.prajjwal.UrbanBites.dto.response.NotificationUnreadCountResponse;
import com.prajjwal.UrbanBites.dto.response.WebhookAckResponse;
import com.prajjwal.UrbanBites.service.NotificationService;
import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationResponse>> listMyNotifications(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(notificationService.listMyNotifications(principal.getName(), page, size));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationUnreadCountResponse> unreadCount(Principal principal) {
        return ResponseEntity.ok(new NotificationUnreadCountResponse(notificationService.getUnreadCount(principal.getName())));
    }

    @PatchMapping("/{notificationId}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WebhookAckResponse> markRead(Principal principal, @PathVariable Long notificationId) {
        notificationService.markRead(principal.getName(), notificationId);
        return ResponseEntity.ok(new WebhookAckResponse("ok"));
    }

    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WebhookAckResponse> markAllRead(Principal principal) {
        int updated = notificationService.markAllRead(principal.getName());
        return ResponseEntity.ok(new WebhookAckResponse("updated=" + updated));
    }

    @PostMapping("/admin/dlq/{jobId}/retry")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WebhookAckResponse> retryDlq(@PathVariable Long jobId) {
        int processed = notificationService.retryDlqJob(jobId);
        return ResponseEntity.ok(new WebhookAckResponse("processed=" + processed));
    }
}

