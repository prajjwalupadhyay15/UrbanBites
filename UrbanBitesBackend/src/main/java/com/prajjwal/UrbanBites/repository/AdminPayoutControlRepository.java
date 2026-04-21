package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.AdminPayoutControl;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminPayoutControlRepository extends JpaRepository<AdminPayoutControl, Long> {

    Optional<AdminPayoutControl> findByRestaurantId(Long restaurantId);
}

