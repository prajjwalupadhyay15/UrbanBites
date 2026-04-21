package com.prajjwal.UrbanBites.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.exception.ApiException;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class GeocodingService {

    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(4);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String nominatimUrl;
    private final String userAgent;

    public GeocodingService(
            ObjectMapper objectMapper,
            @Value("${geocoding.nominatim-url:https://nominatim.openstreetmap.org/search}") String nominatimUrl,
            @Value("${geocoding.user-agent:UrbanBites/1.0 (support@urbanbites.local)}") String userAgent
    ) {
        this.objectMapper = objectMapper;
        this.nominatimUrl = nominatimUrl;
        this.userAgent = userAgent;
        this.httpClient = HttpClient.newBuilder().connectTimeout(HTTP_TIMEOUT).build();
    }

    public Coordinates geocodeAddress(String line1, String line2, String city, String state, String pincode) {
        String query = String.join(", ",
                nonNull(line1),
                nonNull(line2),
                nonNull(city),
                nonNull(state),
                nonNull(pincode),
                "India"
        );

        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
        String url = nominatimUrl + "?format=json&limit=1&q=" + encodedQuery;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(HTTP_TIMEOUT)
                .header("User-Agent", userAgent)
                .header("Accept", "application/json")
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to validate address location right now");
            }

            JsonNode root = objectMapper.readTree(response.body());
            if (!root.isArray() || root.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "We could not locate this address. Please refine the address or choose map pin");
            }

            JsonNode first = root.get(0);
            BigDecimal latitude = parseDecimal(first, "lat");
            BigDecimal longitude = parseDecimal(first, "lon");
            return new Coordinates(latitude, longitude);
        } catch (ApiException ex) {
            throw ex;
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to validate address location right now");
        }
    }

    private BigDecimal parseDecimal(JsonNode node, String fieldName) {
        if (node == null || node.get(fieldName) == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to validate address location right now");
        }
        try {
            return new BigDecimal(node.get(fieldName).asText());
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to validate address location right now");
        }
    }

    private String nonNull(String value) {
        return value == null ? "" : value;
    }

    public record Coordinates(BigDecimal latitude, BigDecimal longitude) {
    }
}

