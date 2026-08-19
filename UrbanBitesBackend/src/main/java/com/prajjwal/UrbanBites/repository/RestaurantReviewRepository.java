package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.RestaurantReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface RestaurantReviewRepository extends JpaRepository<RestaurantReview, Long> {

    List<RestaurantReview> findByRestaurantIdOrderByCreatedAtDesc(Long restaurantId);
    List<RestaurantReview> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<RestaurantReview> findByOrderIdAndUserId(Long orderId, Long userId);

    boolean existsByOrderIdAndUserId(Long orderId, Long userId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM RestaurantReview r WHERE r.restaurant.id = :restaurantId")
    double findAverageRatingByRestaurantId(Long restaurantId);

    long countByRestaurantId(Long restaurantId);
}
