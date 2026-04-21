package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.response.CartResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchEventResponse;
import com.prajjwal.UrbanBites.dto.response.NotificationResponse;
import com.prajjwal.UrbanBites.dto.response.OrderResponse;
import com.prajjwal.UrbanBites.dto.response.RealtimeEventResponse;
import java.time.OffsetDateTime;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RealtimePublisher {

	private final SimpMessagingTemplate messagingTemplate;

	public RealtimePublisher(SimpMessagingTemplate messagingTemplate) {
		this.messagingTemplate = messagingTemplate;
	}

	public void publishUserCart(Long userId, Long cartId, String eventType, CartResponse snapshot) {
		if (userId == null) {
			return;
		}
		RealtimeEventResponse event = new RealtimeEventResponse(
				normalizeEventType(eventType, "CART_UPDATED"),
				cartId,
				OffsetDateTime.now(),
				snapshot
		);
		messagingTemplate.convertAndSend("/topic/users/" + userId + "/cart", event);
	}

	public void publishOrderUpdate(Long orderId, String eventType, OrderResponse snapshot) {
		if (orderId == null) {
			return;
		}
		RealtimeEventResponse event = new RealtimeEventResponse(
				normalizeEventType(eventType, "ORDER_UPDATED"),
				orderId,
				OffsetDateTime.now(),
				snapshot
		);
		messagingTemplate.convertAndSend("/topic/orders/" + orderId + "/status", event);
	}

	public void publishDispatchUpdate(Long orderId, String eventType, DispatchEventResponse snapshot) {
		if (orderId == null) {
			return;
		}
		RealtimeEventResponse event = new RealtimeEventResponse(
				normalizeEventType(eventType, "DISPATCH_UPDATED"),
				orderId,
				OffsetDateTime.now(),
				snapshot
		);
		messagingTemplate.convertAndSend("/topic/orders/" + orderId + "/dispatch", event);
	}

	public void publishOwnerOrder(Long ownerId, String eventType, OrderResponse snapshot) {
		if (ownerId == null) {
			return;
		}
		RealtimeEventResponse event = new RealtimeEventResponse(
				normalizeEventType(eventType, "NEW_ORDER"),
				snapshot == null ? null : snapshot.orderId(),
				OffsetDateTime.now(),
				snapshot
		);
		messagingTemplate.convertAndSend("/topic/owners/" + ownerId + "/orders", event);
	}

	public void publishAgentOffer(Long agentUserId, String eventType, DispatchEventResponse snapshot) {
		if (agentUserId == null) {
			return;
		}
		RealtimeEventResponse event = new RealtimeEventResponse(
				normalizeEventType(eventType, "AGENT_OFFER_UPDATED"),
				snapshot == null ? null : snapshot.assignmentId(),
				OffsetDateTime.now(),
				snapshot
		);
		messagingTemplate.convertAndSend("/topic/agents/" + agentUserId + "/offers", event);
	}

	public void publishUserNotification(Long userId, String eventType, NotificationResponse snapshot) {
		if (userId == null) {
			return;
		}
		RealtimeEventResponse event = new RealtimeEventResponse(
				normalizeEventType(eventType, "NOTIFICATION_UPDATED"),
				snapshot == null ? null : snapshot.id(),
				OffsetDateTime.now(),
				snapshot
		);
		messagingTemplate.convertAndSend("/topic/users/" + userId + "/notifications", event);
	}

	public void publishApprovalUpdate(String approvalScope, Long entityId, String eventType, Object snapshot) {
		if (entityId == null) {
			return;
		}
		RealtimeEventResponse event = new RealtimeEventResponse(
			normalizeEventType(eventType, "APPROVAL_UPDATED"),
			entityId,
			OffsetDateTime.now(),
			snapshot
		);
		String scope = approvalScope == null ? "approvals" : approvalScope.trim().toLowerCase();
		messagingTemplate.convertAndSend("/topic/admin/approvals", event);
		messagingTemplate.convertAndSend("/topic/admin/approvals/" + scope + "/" + entityId, event);
	}

	private String normalizeEventType(String eventType, String fallback) {
		if (eventType == null || eventType.isBlank()) {
			return fallback;
		}
		return eventType.trim().toUpperCase();
	}
}



