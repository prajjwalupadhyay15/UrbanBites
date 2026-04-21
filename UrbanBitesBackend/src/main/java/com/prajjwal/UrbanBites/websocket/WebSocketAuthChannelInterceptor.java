package com.prajjwal.UrbanBites.websocket;

import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.repository.DispatchAssignmentRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.security.CustomUserDetailsService;
import com.prajjwal.UrbanBites.security.JwtService;
import com.prajjwal.UrbanBites.service.TokenRevocationService;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.lang.NonNull;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern USER_CART_TOPIC = Pattern.compile("^/topic/users/(\\d+)/cart$");
    private static final Pattern USER_NOTIFICATIONS_TOPIC = Pattern.compile("^/topic/users/(\\d+)/notifications$");
    private static final Pattern AGENT_OFFERS_TOPIC = Pattern.compile("^/topic/agents/(\\d+)/offers$");
    private static final Pattern OWNER_ORDER_TOPIC = Pattern.compile("^/topic/owners/(\\d+)/orders$");
    private static final Pattern ORDER_TOPIC = Pattern.compile("^/topic/orders/(\\d+)/(status|tracking|dispatch)$");

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final TokenRevocationService tokenRevocationService;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final DispatchAssignmentRepository dispatchAssignmentRepository;

    public WebSocketAuthChannelInterceptor(
            JwtService jwtService,
            CustomUserDetailsService userDetailsService,
            TokenRevocationService tokenRevocationService,
            UserRepository userRepository,
            OrderRepository orderRepository,
            DispatchAssignmentRepository dispatchAssignmentRepository
    ) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.tokenRevocationService = tokenRevocationService;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.dispatchAssignmentRepository = dispatchAssignmentRepository;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            accessor.setUser(authenticate(accessor));
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            Authentication auth = requireAuthentication(accessor);
            enforceTopicAccess(auth, accessor.getDestination());
            return message;
        }

        if (StompCommand.SEND.equals(accessor.getCommand()) && accessor.getDestination() != null
                && accessor.getDestination().startsWith("/app")) {
            Authentication auth = requireAuthentication(accessor);
            enforceSendAccess(auth, accessor.getDestination());
        }

        return message;
    }

    private Authentication authenticate(StompHeaderAccessor accessor) {
        String token = resolveBearerToken(accessor)
                .orElseThrow(() -> new AccessDeniedException("Missing WebSocket bearer token"));

        String username;
        try {
            String tokenType = jwtService.extractTokenType(token);
            if (!JwtService.TOKEN_TYPE_ACCESS.equalsIgnoreCase(tokenType)) {
                throw new AccessDeniedException("Invalid token type for WebSocket");
            }
            String tokenId = jwtService.extractTokenId(token);
            if (tokenRevocationService.isBlacklisted(tokenId)) {
                throw new AccessDeniedException("Token revoked");
            }
            username = jwtService.extractUsername(token);
        } catch (RuntimeException ex) {
            throw new AccessDeniedException("Invalid WebSocket token", ex);
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.isTokenValid(token, userDetails.getUsername(), JwtService.TOKEN_TYPE_ACCESS)) {
            throw new AccessDeniedException("Token validation failed");
        }
        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    private Authentication requireAuthentication(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof Authentication authentication) || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Unauthenticated WebSocket request");
        }
        return authentication;
    }

    private void enforceTopicAccess(Authentication authentication, String destination) {
        if (destination == null || destination.isBlank()) {
            return;
        }

        User user = resolveCurrentUser(authentication);
        if (Role.ADMIN.equals(user.getRole())) {
            return;
        }

        Matcher userCart = USER_CART_TOPIC.matcher(destination);
        if (userCart.matches()) {
            long requestedUserId = Long.parseLong(userCart.group(1));
            if (!user.getId().equals(requestedUserId)) {
                throw new AccessDeniedException("Forbidden cart subscription");
            }
            return;
        }

        Matcher userNotifications = USER_NOTIFICATIONS_TOPIC.matcher(destination);
        if (userNotifications.matches()) {
            long requestedUserId = Long.parseLong(userNotifications.group(1));
            if (!user.getId().equals(requestedUserId)) {
                throw new AccessDeniedException("Forbidden notifications subscription");
            }
            return;
        }

        Matcher agentOffers = AGENT_OFFERS_TOPIC.matcher(destination);
        if (agentOffers.matches()) {
            long requestedAgentId = Long.parseLong(agentOffers.group(1));
            if (!Role.DELIVERY_AGENT.equals(user.getRole()) || !user.getId().equals(requestedAgentId)) {
                throw new AccessDeniedException("Forbidden agent subscription");
            }
            return;
        }

        Matcher ownerOrders = OWNER_ORDER_TOPIC.matcher(destination);
        if (ownerOrders.matches()) {
            long requestedOwnerId = Long.parseLong(ownerOrders.group(1));
            if (!Role.RESTAURANT_OWNER.equals(user.getRole()) || !user.getId().equals(requestedOwnerId)) {
                throw new AccessDeniedException("Forbidden owner subscription");
            }
            return;
        }

        Matcher orderTopic = ORDER_TOPIC.matcher(destination);
        if (orderTopic.matches()) {
            long orderId = Long.parseLong(orderTopic.group(1));
            if (!canAccessOrderTopic(user, orderId)) {
                throw new AccessDeniedException("Forbidden order subscription");
            }
            return;
        }

        if (destination.startsWith("/topic/admin/")) {
            throw new AccessDeniedException("Forbidden admin subscription");
        }
    }

    private boolean canAccessOrderTopic(User user, Long orderId) {
        if (Role.CUSTOMER.equals(user.getRole())) {
            return orderRepository.findByIdAndUserId(orderId, user.getId()).isPresent();
        }
        if (Role.RESTAURANT_OWNER.equals(user.getRole())) {
            return orderRepository.findByIdAndRestaurantOwnerId(orderId, user.getId()).isPresent();
        }
        if (Role.DELIVERY_AGENT.equals(user.getRole())) {
            return dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDescIdDesc(orderId)
                    .map(assignment -> assignment.getAgentUser() != null
                            && user.getId().equals(assignment.getAgentUser().getId()))
                    .orElse(false);
        }
        return false;
    }

    private void enforceSendAccess(Authentication authentication, String destination) {
        if (destination == null || destination.isBlank()) {
            return;
        }

        User user = resolveCurrentUser(authentication);
        if (destination.startsWith("/app/tracking/agent/")) {
            if (!Role.DELIVERY_AGENT.equals(user.getRole())) {
                throw new AccessDeniedException("Only delivery agents can publish live tracking");
            }
        }
    }

    private User resolveCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AccessDeniedException("User no longer exists"));
    }

    private Optional<String> resolveBearerToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            authHeaders = accessor.getNativeHeader("authorization");
        }
        if (authHeaders == null || authHeaders.isEmpty()) {
            return Optional.empty();
        }

        String raw = authHeaders.getFirst();
        if (raw == null || !raw.startsWith("Bearer ")) {
            return Optional.empty();
        }
        return Optional.of(raw.substring(7));
    }
}



