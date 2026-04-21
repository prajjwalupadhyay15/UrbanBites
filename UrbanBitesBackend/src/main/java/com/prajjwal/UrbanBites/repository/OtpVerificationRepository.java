package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.OtpVerification;
import com.prajjwal.UrbanBites.enums.OtpPurpose;
import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OtpVerification> findTopByEmailAndPhoneAndPurposeAndUsedFalseOrderByCreatedAtDesc(
            String email,
            String phone,
            OtpPurpose purpose
    );

    Optional<OtpVerification> findTopByEmailAndPhoneAndPurposeOrderByCreatedAtDesc(
            String email,
            String phone,
            OtpPurpose purpose
    );

    @Modifying
    @Query("""
            update OtpVerification o
            set o.used = true,
                o.usedAt = :now
            where o.used = false
              and ((:email is null and o.email is null) or o.email = :email)
              and ((:phone is null and o.phone is null) or o.phone = :phone)
              and o.purpose = :purpose
            """)
    void invalidateActiveOtps(
            @Param("email") String email,
            @Param("phone") String phone,
            @Param("purpose") OtpPurpose purpose,
            @Param("now") OffsetDateTime now
    );
}

