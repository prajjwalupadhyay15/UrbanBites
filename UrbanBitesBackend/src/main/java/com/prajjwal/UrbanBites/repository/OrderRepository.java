package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.Order;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"restaurant"})
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Order> findByRestaurantIdOrderByCreatedAtDesc(Long restaurantId);

    List<Order> findByRestaurantIdAndCreatedAtAfterOrderByCreatedAtAsc(Long restaurantId, java.time.LocalDateTime date);

    List<Order> findByRestaurantOwnerIdOrderByCreatedAtDesc(Long ownerId);

    Optional<Order> findByIdAndUserId(Long orderId, Long userId);

    Optional<Order> findByIdAndRestaurantId(Long orderId, Long restaurantId);

    Optional<Order> findByIdAndRestaurantOwnerId(Long orderId, Long ownerId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"restaurant"})
    List<Order> findByStatusIn(List<com.prajjwal.UrbanBites.enums.OrderStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :orderId")
    Optional<Order> findByIdForUpdate(@Param("orderId") Long orderId);
}

