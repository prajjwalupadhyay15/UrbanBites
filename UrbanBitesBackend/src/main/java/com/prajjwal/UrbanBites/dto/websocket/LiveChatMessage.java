package com.prajjwal.UrbanBites.dto.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveChatMessage {
    private String senderEmail;
    private String senderName;
    private String text;
    private String imageUrl;
    private boolean isAdmin;
}