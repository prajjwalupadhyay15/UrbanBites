package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.entity.TokenBlacklistEntry;
import com.prajjwal.UrbanBites.repository.TokenBlacklistRepository;
import java.time.OffsetDateTime;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TokenRevocationService {

    private final TokenBlacklistRepository tokenBlacklistRepository;

    public TokenRevocationService(TokenBlacklistRepository tokenBlacklistRepository) {
        this.tokenBlacklistRepository = tokenBlacklistRepository;
    }

    @Transactional
    public void blacklistToken(String tokenId, OffsetDateTime expiresAt) {
        if (tokenId == null || tokenId.isBlank() || expiresAt == null) {
            return;
        }
        tokenBlacklistRepository.deleteExpiredEntries(OffsetDateTime.now());

        if (tokenBlacklistRepository.existsById(tokenId)) {
            return;
        }

        TokenBlacklistEntry entry = new TokenBlacklistEntry();
        entry.setTokenId(tokenId);
        entry.setExpiresAt(expiresAt);
        try {
            tokenBlacklistRepository.save(entry);
        } catch (DataIntegrityViolationException ignored) {
            // Concurrent duplicate blacklist insert; token is already revoked.
        }
    }

    public boolean isBlacklisted(String tokenId) {
        if (tokenId == null || tokenId.isBlank()) {
            return false;
        }
        return tokenBlacklistRepository.existsByTokenIdAndExpiresAtAfter(tokenId, OffsetDateTime.now());
    }
}


