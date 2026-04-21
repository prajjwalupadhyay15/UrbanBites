package com.prajjwal.UrbanBites.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    public static final String TOKEN_TYPE_ACCESS = "ACCESS";
    public static final String TOKEN_TYPE_REFRESH = "REFRESH";
    private static final String CLAIM_TOKEN_TYPE = "token_type";
    private static final String CLAIM_JTI = "jti";

    private final JwtProperties jwtProperties;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    public TokenDetails generateAccessToken(String username) {
        return generateToken(username, TOKEN_TYPE_ACCESS, jwtProperties.getExpirationMs());
    }

    public TokenDetails generateRefreshToken(String username) {
        return generateToken(username, TOKEN_TYPE_REFRESH, jwtProperties.getRefreshExpirationMs());
    }

    public String extractTokenType(String token) {
        Object value = parseClaims(token).get(CLAIM_TOKEN_TYPE);
        return value == null ? null : value.toString();
    }

    public String extractTokenId(String token) {
        Object value = parseClaims(token).get(CLAIM_JTI);
        return value == null ? null : value.toString();
    }

    public OffsetDateTime extractExpiration(String token) {
        return parseClaims(token).getExpiration().toInstant().atOffset(ZoneOffset.UTC);
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, String username, String expectedTokenType) {
        String extracted = extractUsername(token);
        String tokenType = extractTokenType(token);
        return extracted.equalsIgnoreCase(username)
                && expectedTokenType.equalsIgnoreCase(tokenType)
                && !isTokenExpired(token);
    }

    private TokenDetails generateToken(String username, String tokenType, long ttlMs) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + ttlMs);
        String tokenId = UUID.randomUUID().toString().replace("-", "");

        String token = Jwts.builder()
                .subject(username)
                .claim(CLAIM_TOKEN_TYPE, tokenType)
                .claim(CLAIM_JTI, tokenId)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();

        return new TokenDetails(token, tokenId, expiry.toInstant().atOffset(ZoneOffset.UTC));
    }

    private boolean isTokenExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] bytes;
        String secret = jwtProperties.getSecret();
        try {
            bytes = Decoders.BASE64.decode(secret);
        } catch (Exception ignored) {
            bytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public record TokenDetails(String token, String tokenId, OffsetDateTime expiresAt) {
    }
}

