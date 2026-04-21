package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.TokenBlacklistEntry;
import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TokenBlacklistRepository extends JpaRepository<TokenBlacklistEntry, String> {

    boolean existsByTokenIdAndExpiresAtAfter(String tokenId, OffsetDateTime now);

    @Modifying
    @Query("delete from TokenBlacklistEntry e where e.expiresAt <= :now")
    void deleteExpiredEntries(@Param("now") OffsetDateTime now);

}

