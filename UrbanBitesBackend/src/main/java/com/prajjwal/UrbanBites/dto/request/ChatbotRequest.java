package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotRequest {
    
    @NotBlank(message = "Message cannot be empty")
    private String message;
    
    // Optional orderId if the user is asking about a specific order
    private Long orderId;

    // Optional imageUrl if the user is submitting photo evidence
    private String imageUrl;

    // Optional chat history context
    private String chatHistory;
}
