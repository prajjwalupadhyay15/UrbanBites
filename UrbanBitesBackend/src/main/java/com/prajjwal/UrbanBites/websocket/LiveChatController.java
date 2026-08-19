package com.prajjwal.UrbanBites.websocket;

import com.prajjwal.UrbanBites.dto.websocket.LiveChatMessage;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Optional;

@Controller
@RequiredArgsConstructor
public class LiveChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @MessageMapping("/chat.sendToAdmin")
    public void receiveFromUser(Principal principal, @Payload LiveChatMessage message) {
        String email = principal.getName();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            message.setSenderEmail(email);
            message.setSenderName(user.getFullName());
            message.setAdmin(false);
            
            messagingTemplate.convertAndSend("/topic/admin/chat", message);
        }
    }

    @MessageMapping("/chat.replyToUser")
    public void replyToUser(Principal principal, @Payload LiveChatMessage message) {
        // Ensure admin identity
        message.setSenderName("Support Agent");
        message.setAdmin(true);
        
        messagingTemplate.convertAndSendToUser(
                message.getSenderEmail(),
                "/queue/chat", 
                message
        );
    }
}