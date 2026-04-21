package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.RefreshToken;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenIdAndRevokedFalse(String tokenId);

    @Modifying
    @Query("""
            update RefreshToken t
            set t.revoked = true,
                t.revokedAt = :revokedAt
            where t.user.id = :userId
              and t.revoked = false
            """)
    void revokeAllActiveByUserId(@Param("userId") Long userId, @Param("revokedAt") OffsetDateTime revokedAt);
}

