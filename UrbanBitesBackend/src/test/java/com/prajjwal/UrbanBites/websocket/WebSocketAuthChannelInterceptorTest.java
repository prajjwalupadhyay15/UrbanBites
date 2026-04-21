package com.prajjwal.UrbanBites.websocket;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.prajjwal.UrbanBites.entity.Order;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthChannelInterceptorTest {

    @Mock private JwtService jwtService;
    @Mock private CustomUserDetailsService userDetailsService;
    @Mock private TokenRevocationService tokenRevocationService;
    @Mock private UserRepository userRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private DispatchAssignmentRepository dispatchAssignmentRepository;
    @Mock private MessageChannel messageChannel;

    private WebSocketAuthChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketAuthChannelInterceptor(
                jwtService,
                userDetailsService,
                tokenRevocationService,
                userRepository,
                orderRepository,
                dispatchAssignmentRepository
        );
    }

    @Test
    void connect_withValidAccessToken_setsAuthenticatedPrincipal() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.setNativeHeader("Authorization", "Bearer access-token");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        UserDetails details = org.springframework.security.core.userdetails.User.builder()
                .username("customer@example.com")
                .password("na")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                .build();

        when(jwtService.extractTokenType("access-token")).thenReturn(JwtService.TOKEN_TYPE_ACCESS);
        when(jwtService.extractTokenId("access-token")).thenReturn("jti-1");
        when(tokenRevocationService.isBlacklisted("jti-1")).thenReturn(false);
        when(jwtService.extractUsername("access-token")).thenReturn("customer@example.com");
        when(userDetailsService.loadUserByUsername("customer@example.com")).thenReturn(details);
        when(jwtService.isTokenValid("access-token", "customer@example.com", JwtService.TOKEN_TYPE_ACCESS)).thenReturn(true);

        Message<?> result = interceptor.preSend(message, messageChannel);
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);

        assertInstanceOf(UsernamePasswordAuthenticationToken.class, resultAccessor.getUser());
        assertTrue(((UsernamePasswordAuthenticationToken) resultAccessor.getUser()).isAuthenticated());
    }

    @Test
    void subscribe_userCartForAnotherUser_throwsAccessDenied() {
        User current = user(10L, "customer@example.com", Role.CUSTOMER);
        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(current));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/users/99/cart");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "customer@example.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        ));

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void subscribe_customerOwnOrderStatus_allowed() {
        User current = user(10L, "customer@example.com", Role.CUSTOMER);
        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(current));
        when(orderRepository.findByIdAndUserId(301L, 10L)).thenReturn(Optional.of(new Order()));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/301/status");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "customer@example.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        ));

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        Message<?> result = interceptor.preSend(message, messageChannel);

        assertNotNull(result);
    }

    @Test
    void subscribe_notificationsForAnotherUser_throwsAccessDenied() {
        User current = user(10L, "customer@example.com", Role.CUSTOMER);
        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(current));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/users/77/notifications");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "customer@example.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        ));

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void send_trackingPing_asCustomer_throwsAccessDenied() {
        User current = user(10L, "customer@example.com", Role.CUSTOMER);
        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(current));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination("/app/tracking/agent/ping");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "customer@example.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        ));

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void send_trackingPing_asDeliveryAgent_allowed() {
        User current = user(21L, "agent@example.com", Role.DELIVERY_AGENT);
        when(userRepository.findByEmailIgnoreCase("agent@example.com")).thenReturn(Optional.of(current));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination("/app/tracking/agent/ping");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "agent@example.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_DELIVERY_AGENT"))
        ));

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        Message<?> result = interceptor.preSend(message, messageChannel);

        assertNotNull(result);
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", id);
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setFullName("Test");
        user.setRole(role);
        user.setEnabled(true);
        return user;
    }
}



