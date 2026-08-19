package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.ChatbotRequest;
import com.prajjwal.UrbanBites.dto.response.ChatbotResponse;
import com.prajjwal.UrbanBites.service.ChatbotService;
import com.prajjwal.UrbanBites.service.ImageStorageService;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/chatbot")
@Slf4j
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final ImageStorageService imageStorageService;
    
    // Rate Limiter per user: 10 requests per minute
    private final Map<String, Bucket> userBuckets = new ConcurrentHashMap<>();

    public ChatbotController(ChatbotService chatbotService, ImageStorageService imageStorageService) {
        this.chatbotService = chatbotService;
        this.imageStorageService = imageStorageService;
    }

    private Bucket resolveBucket(String email) {
        return userBuckets.computeIfAbsent(email, key -> 
            Bucket.builder()
                  .addLimit(Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1))))
                  .build()
        );
    }

    @PostMapping("/message")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> handleMessage(Principal principal, @Valid @RequestBody ChatbotRequest request) {
        String email = principal.getName();
        
        Bucket bucket = resolveBucket(email);
        if (!bucket.tryConsume(1)) {
            log.warn("Rate limit exceeded for user: {}", email);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ChatbotResponse.builder()
                            .reply("You're sending messages too quickly. Please wait a moment.")
                            .build());
        }

        ChatbotResponse response = chatbotService.handleChat(request, email);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> uploadImage(Principal principal, @RequestParam("image") MultipartFile image) {
        String email = principal.getName();
        
        Bucket bucket = resolveBucket(email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }

        try {
            String imageUrl = imageStorageService.saveChatbotImage(image);
            return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
        } catch (Exception e) {
            log.error("Failed to upload image for chatbot", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Image upload failed"));
        }
    }
}
