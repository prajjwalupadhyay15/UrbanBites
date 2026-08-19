package com.prajjwal.UrbanBites.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.dto.request.ChatbotRequest;
import com.prajjwal.UrbanBites.dto.response.ChatbotResponse;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.OrderItem;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.entity.AdminDisputeCase;
import com.prajjwal.UrbanBites.enums.AdminDisputeStatus;
import com.prajjwal.UrbanBites.enums.AdminDisputeType;
import com.prajjwal.UrbanBites.repository.AdminDisputeCaseRepository;
import com.prajjwal.UrbanBites.repository.OrderItemRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.enums.PaymentStatus;
import com.prajjwal.UrbanBites.repository.PaymentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final GroqService groqService;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final AdminDisputeCaseRepository adminDisputeCaseRepository;
    private final PaymentRepository paymentRepository;
    private final RazorpayPaymentGatewayClient paymentGatewayClient;
    private final RealtimePublisher realtimePublisher;
    private final WalletService walletService;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    // Regex patterns to strip order number references from AI reply text
    // Matches: "Order #55", "#55", "Order ID: 55", "Order ID 55", "order #101", "Order 55", etc.
    private static final Pattern ORDER_NUM_PATTERN = Pattern.compile(
        "(?i)(?:order\\s*(?:id)?\\s*[:#]?\\s*\\d+|#\\d+)"
    );

    public ChatbotResponse handleChat(ChatbotRequest request, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Fetch user's recent orders (active + delivered) (limit to last 10 for context)
        List<Order> allOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<Order> recentOrders = new ArrayList<>();
        for (Order o : allOrders) {
            if (o.getStatus() != OrderStatus.CREATED && o.getStatus() != OrderStatus.PENDING_PAYMENT && o.getStatus() != OrderStatus.CANCELLED) {
                recentOrders.add(o);
                if (recentOrders.size() >= 10) break;
            }
        }

        // Fetch order items for each recent order (for deep context)
        Map<Long, List<OrderItem>> orderItemsMap = new LinkedHashMap<>();
        for (Order order : recentOrders) {
            List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
            orderItemsMap.put(order.getId(), items);
        }

        // Build the prompt context
        String systemPrompt = buildSystemPrompt(user.getFullName(), recentOrders, orderItemsMap);
        
        String userMessage = request.getMessage();
        if (request.getImageUrl() != null && !request.getImageUrl().isEmpty()) {
            userMessage += "\n[User uploaded an image: " + request.getImageUrl() + "]";
        }
        
        String fullPrompt = systemPrompt + "\nUser Message: " + userMessage;
        
        if (request.getChatHistory() != null && !request.getChatHistory().isEmpty()) {
            fullPrompt += "\n\n--- Recent Chat History ---\n" + request.getChatHistory() + "\n---------------------------";
        }

        // Do NOT send the image to Groq. We skip AI vision and let humans review it.
        String aiResponseJson = groqService.generateContent(fullPrompt, null);

        // Parse the AI Response and enrich with order cards from DB when needed
        return parseAiResponse(aiResponseJson, user, request, recentOrders, orderItemsMap);
    }

    private String buildSystemPrompt(String userName, List<Order> orders, Map<Long, List<OrderItem>> orderItemsMap) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an intelligent customer support chatbot for a food delivery app called 'UrbanBites', similar to Zomato's support bot.\n");
        sb.append("Your goal is to assist the user named ").append(userName).append(".\n");
        sb.append("Be friendly, empathetic, and professional. Use the customer's first name when appropriate.\n\n");

        // --- Deep Order Context ---
        sb.append("=== USER'S RECENT ORDERS ===\n");
        if (orders.isEmpty()) {
            sb.append("No recent orders found.\n");
        } else {
            for (Order order : orders) {
                String restaurantName = "Unknown Restaurant";
                try {
                    restaurantName = order.getRestaurant().getName();
                } catch (Exception ignored) {}

                String orderDate = "Unknown";
                try {
                    orderDate = order.getCreatedAt().format(DATE_FMT);
                } catch (Exception ignored) {}

                sb.append("Order #").append(order.getId())
                  .append(" | Restaurant: ").append(restaurantName)
                  .append(" | Status: ").append(order.getStatus())
                  .append(" | Total: ₹").append(order.getGrandTotal())
                  .append(" | Ordered: ").append(orderDate);

                if (order.getEtaMinutes() != null) {
                    sb.append(" | ETA: ").append(order.getEtaMinutes()).append(" min");
                }
                sb.append("\n");

                // Append item-level details
                List<OrderItem> items = orderItemsMap.get(order.getId());
                if (items != null && !items.isEmpty()) {
                    sb.append("   Items: ");
                    for (int i = 0; i < items.size(); i++) {
                        OrderItem item = items.get(i);
                        sb.append(item.getQuantity()).append("x ").append(item.getItemName())
                          .append(" (₹").append(item.getLineTotal()).append(")");
                        if (i < items.size() - 1) sb.append(", ");
                    }
                    sb.append("\n");
                }
            }
        }
        sb.append("=== END ORDERS ===\n\n");

        // --- Platform Policy Knowledge ---
        sb.append("=== URBANBITES PLATFORM POLICIES ===\n");
        sb.append("• Cancellation: Orders can only be cancelled before the restaurant starts preparing. Once status is PREPARING or beyond, cancellation is not possible.\n");
        sb.append("• Refunds: You CANNOT directly issue refunds. All refund requests must go through the dispute process (RAISE_DISPUTE action). An admin will review and approve/deny.\n");
        sb.append("• Delivery Tracking: If the order status is OUT_FOR_DELIVERY, the user can track it on the Orders page. If status is DELIVERED, the delivery is already completed.\n");
        sb.append("• Food Quality Issues: Require photo evidence from the user before raising a dispute. This is mandatory.\n");
        sb.append("• Missing Items: Ask the user which specific item(s) are missing. Then raise a dispute referencing the specific items.\n");
        sb.append("• Late Delivery: Check the order ETA. If delivery is significantly delayed, empathize and offer to raise a dispute if desired.\n");
        sb.append("• Reorder: Users can reorder from the Orders page. Guide them there if they want to repeat a past order.\n");
        sb.append("=== END POLICIES ===\n\n");

        // --- Conversation Flow Rules ---
        sb.append("=== CONVERSATION FLOW RULES ===\n");
        sb.append("• GREETING RESPONSES: If the user says 'hi', 'hello', 'hey', etc., greet them warmly and ask how you can help. Provide suggestedReplies with common options.\n");
        sb.append("• THANK YOU / GOODBYE: If the user says 'thank you', 'thanks', 'bye', 'okay thanks', 'that's all', 'no more help needed', or any form of gratitude/farewell, respond warmly (e.g., 'You're welcome! Have a great day! 😊'). Do NOT ask for order numbers, do NOT continue troubleshooting, do NOT ask follow-up questions. Just end the conversation gracefully. Set suggestedReplies to an empty array.\n");
        sb.append("• ORDER SELECTION: When you need the user to identify which order they are referring to, set \"showOrderPicker\" to true. Do NOT list order numbers in your text reply. Do NOT mention specific order IDs like '#101' or '#55'. The app will automatically show visual cards of their recent orders for them to tap on. Just say something like 'Which order are you referring to? Please tap on one below:' and set showOrderPicker to true.\n");
        sb.append("• ALREADY RESOLVED: If a dispute was just raised or an issue was just handled, and the user says thank you or acknowledges it, consider the conversation resolved. Do not re-ask about orders.\n");
        sb.append("=== END FLOW RULES ===\n\n");

        // --- Escalation Workflow ---
        sb.append("STRICT ESCALATION WORKFLOW (Zomato-style):\n");
        sb.append("1. Active Order Context: If an order is active (CONFIRMED, PREPARING, OUT_FOR_DELIVERY), you can provide its ETA if the user asks. If it is delayed, you can use PING_RESTAURANT to nudge the restaurant.\n");
        sb.append("2. If a user complains about an order, ask them to select the order using the order picker (set showOrderPicker to true). Do NOT list order IDs in your reply text.\n");
        sb.append("3. If the complaint is about FOOD QUALITY (e.g., burnt, spilled), you MUST ask the user to upload a photo. Set `requiresImage` to true and wait for them to provide it.\n");
        sb.append("4. CRITICAL: Do NOT proceed or trigger RAISE_DISPUTE until the user ACTUALLY uploads a photo. You will know they uploaded a photo if you see '[User uploaded an image: URL]' in their message.\n");
        sb.append("5. Automated Refund: If the complaint is minor (missing dip, slightly spilled) and the user wants a refund, and the estimated item value is ₹50 or less, you can instantly trigger AUTO_REFUND with `refundAmount` up to 50.\n");
        sb.append("6. BEFORE triggering AUTO_REFUND, you MUST ask the user if they want the refund to their UrbanBites WALLET (instant) or their ORIGINAL payment method (3-5 days). Once they reply, you can trigger AUTO_REFUND and set `refundDestination`.\n");
        sb.append("7. Automated Cancellation: If the user wants to cancel an order, and the status is CONFIRMED, you can trigger CANCEL_ORDER. If it is PREPARING or later, you must deny the cancellation and explain the restaurant has already started preparing it.\n");
        sb.append("8. BEFORE triggering CANCEL_ORDER, you MUST ask the user if they want the refund to their UrbanBites WALLET (instant) or their ORIGINAL payment method (3-5 days). Once they reply, you can trigger CANCEL_ORDER and set `refundDestination`.\n");
        sb.append("9. If the issue requires human review (high value, complex dispute), you must trigger the `RAISE_DISPUTE` action to log a ticket for the admin.\n");

        // --- JSON Output Schema ---
        sb.append("\n=== RESPONSE FORMAT ===\n");
        sb.append("You MUST output your response strictly as a JSON object with the following fields:\n");
        sb.append("   - \"reply\": The text message to show to the user. You can use **bold** for emphasis and \\n for line breaks. NEVER include raw order IDs like '#55' or '#101' when asking which order — just ask them to tap below.\n");
        sb.append("   - \"action\": Set to \"RAISE_DISPUTE\", \"AUTO_REFUND\", \"CANCEL_ORDER\", or \"PING_RESTAURANT\". Otherwise null.\n");
        sb.append("   - \"orderId\": The numeric ID of the order if an action is taken. Otherwise null.\n");
        sb.append("   - \"reason\": A specific description of the issue. You MUST provide a reason when taking an action.\n");
        sb.append("   - \"refundAmount\": The numeric amount to refund (max 50) if action is AUTO_REFUND. Otherwise null.\n");
        sb.append("   - \"refundDestination\": Set to \"WALLET\" or \"ORIGINAL\" if action is AUTO_REFUND or CANCEL_ORDER and the user has chosen their destination. Otherwise null.\n");
        sb.append("   - \"imageUrl\": The URL of the image provided by the user. MUST be provided when raising a food quality dispute.\n");
        sb.append("   - \"requiresImage\": boolean true if you are asking the user to upload a photo, otherwise false.\n");
        sb.append("   - \"suggestedReplies\": An optional array of 2-3 string options the user can click. Set to empty array [] when conversation is ending.\n");
        sb.append("   - \"showOrderPicker\": boolean true if you need the user to select an order from their recent orders. The app will automatically show visual order cards with images and menu details. Otherwise false.\n");
        sb.append("   - \"orderCard\": If referencing a specific order in your reply, include: {\"id\": <orderId>, \"restaurant\": \"<name>\", \"items\": \"<summary>\", \"status\": \"<status>\", \"total\": \"<amount>\", \"createdAt\": \"<date>\"}. Otherwise null.\n");
        sb.append("\nExample (asking which order): {\"reply\": \"I'm sorry to hear that! Which order are you referring to? Please tap on one below:\", \"action\": null, \"orderId\": null, \"reason\": null, \"imageUrl\": null, \"requiresImage\": false, \"suggestedReplies\": [], \"showOrderPicker\": true, \"orderCard\": null}\n");
        sb.append("Example (thank you): {\"reply\": \"You're welcome! Glad I could help. Have a great day! 😊\", \"action\": null, \"orderId\": null, \"reason\": null, \"imageUrl\": null, \"requiresImage\": false, \"suggestedReplies\": [], \"showOrderPicker\": false, \"orderCard\": null}\n");
        sb.append("Example (dispute raised): {\"reply\": \"I have raised a ticket for your burnt garlic bread from Pizza Palace. Our team will review it shortly.\", \"action\": \"RAISE_DISPUTE\", \"orderId\": 105, \"reason\": \"Burnt Garlic Bread\", \"imageUrl\": \"http://localhost:8080/uploads/chatbot/abc.jpg\", \"requiresImage\": false, \"suggestedReplies\": [\"Thank you\", \"Speak to human\"], \"showOrderPicker\": false, \"orderCard\": {\"id\": 105, \"restaurant\": \"Pizza Palace\", \"items\": \"1x Garlic Bread, 2x Margherita Pizza\", \"status\": \"DELIVERED\", \"total\": \"₹450.00\", \"createdAt\": \"20 Jul 2026, 08:30 PM\"}}\n");
        sb.append("Do NOT include markdown formatting like ```json in your output. Just output the raw JSON object.\n");
        sb.append("=== END RESPONSE FORMAT ===\n");
        
        return sb.toString();
    }

    /**
     * Build rich order card data from the DB for a single order, including restaurant image and item details.
     */
    private Map<String, Object> buildOrderCardFromDb(Order order, List<OrderItem> items) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", order.getId());

        String restaurantName = "Unknown Restaurant";
        String restaurantImage = null;
        try {
            restaurantName = order.getRestaurant().getName();
            restaurantImage = order.getRestaurant().getImagePath();
        } catch (Exception ignored) {}

        card.put("restaurant", restaurantName);
        card.put("restaurantImage", restaurantImage);

        // Build items summary string
        if (items != null && !items.isEmpty()) {
            StringBuilder itemsSb = new StringBuilder();
            for (int i = 0; i < items.size(); i++) {
                OrderItem item = items.get(i);
                itemsSb.append(item.getQuantity()).append("x ").append(item.getItemName());
                if (i < items.size() - 1) itemsSb.append(", ");
            }
            card.put("items", itemsSb.toString());
        } else {
            card.put("items", "");
        }

        card.put("status", order.getStatus() != null ? order.getStatus().name() : "UNKNOWN");
        card.put("total", "₹" + order.getGrandTotal());

        String orderDate = "Unknown";
        try {
            orderDate = order.getCreatedAt().atZoneSameInstant(java.time.ZoneId.systemDefault()).format(DATE_FMT);
        } catch (Exception ignored) {}
        card.put("createdAt", orderDate);

        return card;
    }

    /**
     * Remove order number references (e.g. "#55", "Order #101") from AI reply text.
     * Cleans up leftover double spaces and awkward punctuation after removal.
     */
    private String sanitizeOrderNumbersFromReply(String reply) {
        if (reply == null || reply.isEmpty()) return reply;
        String cleaned = ORDER_NUM_PATTERN.matcher(reply).replaceAll("");
        // Clean up leftover artifacts: double spaces, orphaned commas/colons, leading/trailing spaces
        cleaned = cleaned.replaceAll("\\s{2,}", " ");
        cleaned = cleaned.replaceAll("\\s*,\\s*,", ",");
        cleaned = cleaned.replaceAll(":\\s*,", ":");
        cleaned = cleaned.replaceAll("\\(\\s*\\)", "");
        return cleaned.trim();
    }

    private ChatbotResponse parseAiResponse(String aiResponseJson, User user, ChatbotRequest request,
                                             List<Order> recentOrders, Map<Long, List<OrderItem>> orderItemsMap) {
        try {
            String cleanJson = aiResponseJson;
            int start = cleanJson.indexOf("{");
            int end = cleanJson.lastIndexOf("}");
            if (start != -1 && end != -1 && end >= start) {
                cleanJson = cleanJson.substring(start, end + 1);
            }
            JsonNode root = objectMapper.readTree(cleanJson);
            
            String reply = root.has("reply") ? root.get("reply").asText() : "I'm sorry, I couldn't understand that.";
            String action = root.has("action") && !root.get("action").isNull() ? root.get("action").asText() : null;
            Long orderId = root.has("orderId") && !root.get("orderId").isNull() ? root.get("orderId").asLong() : null;
            String reason = root.has("reason") && !root.get("reason").isNull() ? root.get("reason").asText() : null;
            Double refundAmount = root.has("refundAmount") && !root.get("refundAmount").isNull() ? root.get("refundAmount").asDouble() : null;
            String refundDestination = root.has("refundDestination") && !root.get("refundDestination").isNull() ? root.get("refundDestination").asText() : "ORIGINAL";
            String aiImageUrl = root.has("imageUrl") && !root.get("imageUrl").isNull() ? root.get("imageUrl").asText() : null;
            Boolean requiresImage = root.has("requiresImage") && !root.get("requiresImage").isNull() ? root.get("requiresImage").asBoolean() : false;
            Boolean showOrderPicker = root.has("showOrderPicker") && !root.get("showOrderPicker").isNull() ? root.get("showOrderPicker").asBoolean() : false;

            // Always strip order numbers from reply text — the AI should never expose raw IDs to users
            reply = sanitizeOrderNumbersFromReply(reply);
            
            java.util.List<String> suggestedReplies = new java.util.ArrayList<>();
            if (root.has("suggestedReplies") && root.get("suggestedReplies").isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode node : root.get("suggestedReplies")) {
                    suggestedReplies.add(node.asText());
                }
            }

            // Parse single orderCard if present
            Map<String, Object> orderCard = null;
            if (root.has("orderCard") && !root.get("orderCard").isNull() && root.get("orderCard").isObject()) {
                orderCard = objectMapper.convertValue(root.get("orderCard"), Map.class);
            }

            // If AI wants to show the order picker, build all order cards from DB (with restaurant images and items)
            List<Map<String, Object>> orderCards = null;
            if (Boolean.TRUE.equals(showOrderPicker) && !recentOrders.isEmpty()) {
                orderCards = new ArrayList<>();
                for (Order order : recentOrders) {
                    List<OrderItem> items = orderItemsMap.get(order.getId());
                    orderCards.add(buildOrderCardFromDb(order, items));
                }
            }
            
            // Handle advanced chatbot actions
            if (orderId != null) {
                orderRepository.findById(orderId).ifPresent(order -> {
                    if ("RAISE_DISPUTE".equals(action)) {
                        AdminDisputeCase dispute = new AdminDisputeCase();
                        dispute.setOrder(order);
                        dispute.setCreatedByUser(user);
                        dispute.setType(AdminDisputeType.ORDER);
                        dispute.setStatus(AdminDisputeStatus.OPEN);
                        dispute.setTitle("AI Chatbot Ticket: Order #" + orderId);
                        String disputeDescription = reason != null && !reason.trim().isEmpty() ? reason : "Automated dispute raised by AI chatbot.";
                        if (aiImageUrl != null && !aiImageUrl.trim().isEmpty()) {
                            dispute.setImageUrl(aiImageUrl);
                        } else if (request.getImageUrl() != null && !request.getImageUrl().isEmpty()) {
                            dispute.setImageUrl(request.getImageUrl());
                        }
                        dispute.setDescription(disputeDescription);
                        adminDisputeCaseRepository.save(dispute);
                    } else if ("PING_RESTAURANT".equals(action)) {
                        realtimePublisher.publishOwnerOrder(order.getRestaurant().getOwner().getId(), "URGENT_PING", null);
                    } else if ("CANCEL_ORDER".equals(action)) {
                        if (OrderStatus.CONFIRMED.equals(order.getStatus()) || OrderStatus.CREATED.equals(order.getStatus())) {
                            order.setStatus(OrderStatus.CANCELLED);
                            orderRepository.save(order);
                            // Process full refund
                            paymentRepository.findByOrderId(orderId).ifPresent(payment -> {
                                if (PaymentStatus.CAPTURED.equals(payment.getStatus()) && payment.getProviderPaymentId() != null) {
                                    try {
                                        if ("WALLET".equalsIgnoreCase(refundDestination)) {
                                            walletService.credit(user.getId(), payment.getAmount(), com.prajjwal.UrbanBites.enums.WalletTransactionReferenceType.ORDER_REFUND, orderId, "Order Cancellation Refund");
                                        } else {
                                            paymentGatewayClient.createRefund(payment.getProviderPaymentId(), payment.getAmount(), "chatbot-cancel-" + orderId, "Cancelled by user");
                                        }
                                        payment.setStatus(PaymentStatus.REFUNDED_FULL);
                                        payment.setRefundedAmount(payment.getAmount());
                                        paymentRepository.save(payment);
                                    } catch (Exception ignored) {}
                                }
                            });
                        }
                    } else if ("AUTO_REFUND".equals(action) && refundAmount != null && refundAmount > 0) {
                        BigDecimal refundVal = BigDecimal.valueOf(Math.min(refundAmount, 50.0)).setScale(2, RoundingMode.HALF_UP);
                        paymentRepository.findByOrderId(orderId).ifPresent(payment -> {
                            if (PaymentStatus.CAPTURED.equals(payment.getStatus()) && payment.getProviderPaymentId() != null) {
                                try {
                                    if ("WALLET".equalsIgnoreCase(refundDestination)) {
                                        walletService.credit(user.getId(), refundVal, com.prajjwal.UrbanBites.enums.WalletTransactionReferenceType.ORDER_REFUND, orderId, reason != null ? reason : "AI Auto Refund");
                                    } else {
                                        paymentGatewayClient.createRefund(payment.getProviderPaymentId(), refundVal, "auto-refund-" + System.currentTimeMillis(), reason != null ? reason : "AI Auto Refund");
                                    }
                                    BigDecimal refunded = payment.getRefundedAmount() != null ? payment.getRefundedAmount() : BigDecimal.ZERO;
                                    payment.setRefundedAmount(refunded.add(refundVal));
                                    if (payment.getRefundedAmount().compareTo(payment.getAmount()) >= 0) {
                                        payment.setStatus(PaymentStatus.REFUNDED_FULL);
                                    } else {
                                        payment.setStatus(PaymentStatus.REFUNDED_PARTIAL);
                                    }
                                    paymentRepository.save(payment);
                                    
                                    // Log a resolved dispute ticket for record keeping
                                    AdminDisputeCase dispute = new AdminDisputeCase();
                                    dispute.setOrder(order);
                                    dispute.setCreatedByUser(user);
                                    dispute.setType(AdminDisputeType.ORDER);
                                    dispute.setStatus(AdminDisputeStatus.RESOLVED);
                                    dispute.setTitle("AI Auto Refund: Order #" + orderId);
                                    dispute.setDescription(reason != null ? reason : "Automatically refunded ₹" + refundVal + " by AI.");
                                    dispute.setResolutionNote("Auto-refunded ₹" + refundVal);
                                    dispute.setResolvedAt(java.time.OffsetDateTime.now());
                                    adminDisputeCaseRepository.save(dispute);
                                } catch (Exception ignored) {}
                            }
                        });
                    }
                });
            }
            
            return ChatbotResponse.builder()
                    .reply(reply)
                    .action(action)
                    .orderId(orderId)
                    .reason(reason)
                    .requiresImage(requiresImage)
                    .suggestedReplies(suggestedReplies)
                    .orderCard(orderCard)
                    .orderCards(orderCards)
                    .showOrderPicker(showOrderPicker)
                    .build();
        } catch (Exception e) {
            e.printStackTrace();
            return ChatbotResponse.builder()
                    .reply(aiResponseJson) // fallback to raw string if not valid JSON
                    .build();
        }
    }
}
