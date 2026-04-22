package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.MenuItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findByRestaurantIdOrderByIdDesc(Long restaurantId);

    List<MenuItem> findByRestaurantIdAndAvailableTrueOrderByIdDesc(Long restaurantId);

    List<MenuItem> findByRestaurantIdInAndAvailableTrue(List<Long> restaurantIds);

    Optional<MenuItem> findByIdAndRestaurantId(Long id, Long restaurantId);

    Optional<MenuItem> findByIdAndAvailableTrue(Long id);

    List<MenuItem> findByNameContainingIgnoreCaseAndAvailableTrue(String name);
}

