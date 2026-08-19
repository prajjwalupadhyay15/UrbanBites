package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.WithdrawalRequest;
import com.prajjwal.UrbanBites.enums.WithdrawalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, UUID> {
    List<WithdrawalRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<WithdrawalRequest> findByStatusOrderByCreatedAtDesc(WithdrawalStatus status);
}
