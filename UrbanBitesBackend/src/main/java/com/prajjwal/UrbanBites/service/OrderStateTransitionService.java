package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.enums.PaymentStatus;
import com.prajjwal.UrbanBites.enums.TransitionActor;
import com.prajjwal.UrbanBites.exception.ApiException;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class OrderStateTransitionService {

    private static final Map<OrderStatus, Set<OrderStatus>> ORDER_TRANSITIONS = Map.of(
            OrderStatus.CREATED, EnumSet.of(OrderStatus.PENDING_PAYMENT),
            OrderStatus.PENDING_PAYMENT, EnumSet.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, EnumSet.of(OrderStatus.ACCEPTED_BY_RESTAURANT, OrderStatus.PREPARING),
            OrderStatus.ACCEPTED_BY_RESTAURANT, EnumSet.of(OrderStatus.PREPARING),
            OrderStatus.PREPARING, EnumSet.of(OrderStatus.READY_FOR_PICKUP),
            OrderStatus.READY_FOR_PICKUP, EnumSet.of(OrderStatus.OUT_FOR_DELIVERY),
            OrderStatus.OUT_FOR_DELIVERY, EnumSet.of(OrderStatus.DELIVERED),
            OrderStatus.DELIVERED, EnumSet.noneOf(OrderStatus.class),
            OrderStatus.CANCELLED, EnumSet.noneOf(OrderStatus.class)
    );

    private static final Map<TransitionKey, Set<TransitionActor>> ORDER_TRANSITION_ACTORS = Map.ofEntries(
            Map.entry(new TransitionKey(OrderStatus.CREATED, OrderStatus.PENDING_PAYMENT), EnumSet.of(TransitionActor.SYSTEM)),
            Map.entry(new TransitionKey(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED), EnumSet.of(TransitionActor.SYSTEM)),
            Map.entry(new TransitionKey(OrderStatus.CONFIRMED, OrderStatus.ACCEPTED_BY_RESTAURANT), EnumSet.of(TransitionActor.RESTAURANT_OWNER, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.CONFIRMED, OrderStatus.PREPARING), EnumSet.of(TransitionActor.RESTAURANT_OWNER, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.ACCEPTED_BY_RESTAURANT, OrderStatus.PREPARING), EnumSet.of(TransitionActor.RESTAURANT_OWNER, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP), EnumSet.of(TransitionActor.RESTAURANT_OWNER, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY), EnumSet.of(TransitionActor.DELIVERY_AGENT, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED), EnumSet.of(TransitionActor.DELIVERY_AGENT, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED), EnumSet.of(TransitionActor.CUSTOMER, TransitionActor.ADMIN, TransitionActor.SYSTEM)),
            Map.entry(new TransitionKey(OrderStatus.CONFIRMED, OrderStatus.CANCELLED), EnumSet.of(TransitionActor.RESTAURANT_OWNER, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.ACCEPTED_BY_RESTAURANT, OrderStatus.CANCELLED), EnumSet.of(TransitionActor.RESTAURANT_OWNER, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.PREPARING, OrderStatus.CANCELLED), EnumSet.of(TransitionActor.RESTAURANT_OWNER, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED), EnumSet.of(TransitionActor.RESTAURANT_OWNER, TransitionActor.ADMIN)),
            Map.entry(new TransitionKey(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED), EnumSet.of(TransitionActor.ADMIN))
    );

    private static final Map<PaymentStatus, Set<PaymentStatus>> PAYMENT_TRANSITIONS = Map.of(
            PaymentStatus.INITIATED, EnumSet.of(PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PaymentStatus.FAILED),
            PaymentStatus.AUTHORIZED, EnumSet.of(PaymentStatus.CAPTURED, PaymentStatus.FAILED),
            PaymentStatus.CAPTURED, EnumSet.of(PaymentStatus.REFUNDED_PARTIAL, PaymentStatus.REFUNDED_FULL),
            PaymentStatus.FAILED, EnumSet.noneOf(PaymentStatus.class),
            PaymentStatus.REFUNDED_PARTIAL, EnumSet.of(PaymentStatus.REFUNDED_FULL),
            PaymentStatus.REFUNDED_FULL, EnumSet.noneOf(PaymentStatus.class)
    );

    public void assertOrderTransition(OrderStatus from, OrderStatus to, TransitionActor actor) {
        Set<OrderStatus> allowed = ORDER_TRANSITIONS.getOrDefault(from, EnumSet.noneOf(OrderStatus.class));
        if (!allowed.contains(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid order state transition");
        }

        TransitionKey key = new TransitionKey(from, to);
        Set<TransitionActor> allowedActors = ORDER_TRANSITION_ACTORS.getOrDefault(key, EnumSet.noneOf(TransitionActor.class));
        if (!allowedActors.contains(actor)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not allowed to perform this order transition");
        }
    }

    public void assertPaymentTransition(PaymentStatus from, PaymentStatus to) {
        Set<PaymentStatus> allowed = PAYMENT_TRANSITIONS.getOrDefault(from, EnumSet.noneOf(PaymentStatus.class));
        if (!allowed.contains(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid payment state transition");
        }
    }

    private record TransitionKey(OrderStatus from, OrderStatus to) {
    }
}

