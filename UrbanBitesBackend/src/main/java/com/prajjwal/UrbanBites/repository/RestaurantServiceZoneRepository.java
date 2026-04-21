package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.RestaurantServiceZone;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantServiceZoneRepository extends JpaRepository<RestaurantServiceZone, Long> {

    Optional<RestaurantServiceZone> findByRestaurantIdAndServiceZoneId(Long restaurantId, Long zoneId);

    List<RestaurantServiceZone> findByRestaurantIdInAndServiceZoneIdIn(List<Long> restaurantIds, List<Long> zoneIds);
}

