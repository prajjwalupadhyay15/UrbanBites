package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.Address;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);

    Optional<Address> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    @Modifying
    @Query("update Address a set a.isDefault = false where a.user.id = :userId and a.isDefault = true")
    void clearDefaultForUser(@Param("userId") Long userId);

    Optional<Address> findTopByUserIdAndIdNotOrderByCreatedAtAsc(Long userId, Long excludedId);

    Optional<Address> findTopByUserIdAndIsDefaultTrue(Long userId);
}


