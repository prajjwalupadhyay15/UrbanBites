package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.MenuItemReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MenuItemReviewRepository extends JpaRepository<MenuItemReview, Long> {
    List<MenuItemReview> findByMenuItemIdOrderByCreatedAtDesc(Long menuItemId);
    Optional<MenuItemReview> findByUserIdAndMenuItemIdAndOrderId(Long userId, Long menuItemId, Long orderId);
    
    @Query("SELECT AVG(r.rating) FROM MenuItemReview r WHERE r.menuItem.id = :menuItemId")
    Double calculateAverageRating(@Param("menuItemId") Long menuItemId);
}
