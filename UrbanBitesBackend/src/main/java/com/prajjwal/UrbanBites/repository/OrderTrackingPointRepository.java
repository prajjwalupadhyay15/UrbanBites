package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.OrderTrackingPoint;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface OrderTrackingPointRepository extends MongoRepository<OrderTrackingPoint, String> {

    Optional<OrderTrackingPoint> findTopByOrderIdOrderByCreatedAtDesc(Long orderId);

    List<OrderTrackingPoint> findTop200ByOrderIdOrderByCreatedAtDesc(Long orderId);
}

