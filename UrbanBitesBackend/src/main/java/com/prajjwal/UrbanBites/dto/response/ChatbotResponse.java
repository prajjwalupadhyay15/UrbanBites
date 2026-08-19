package com.prajjwal.UrbanBites.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotResponse {
    private String reply;
    
    // E.g. "RAISE_DISPUTE", "ASK_FOR_IMAGE", or null
    private String action;
    
    private Long orderId;
    
    private String reason;
    
    private Boolean requiresImage;
    
    private List<String> suggestedReplies;

    // Rich order card data for inline rendering (single card for reference)
    private Map<String, Object> orderCard;

    // Multiple order cards for the order picker (user selects one)
    private List<Map<String, Object>> orderCards;

    // When true, the frontend should display the order picker with orderCards
    private Boolean showOrderPicker;
}

