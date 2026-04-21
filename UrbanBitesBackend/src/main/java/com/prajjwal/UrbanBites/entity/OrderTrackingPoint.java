package com.prajjwal.UrbanBites.entity;

import com.prajjwal.UrbanBites.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "order_tracking_points")
public class OrderTrackingPoint {

    @Id
    private String id;

    private Long orderId;

    private Long agentUserId;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private BigDecimal speedKmph;

    private Integer etaMinutes;

    private OrderStatus orderStatus;

    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public Long getAgentUserId() { return agentUserId; }
    public void setAgentUserId(Long agentUserId) { this.agentUserId = agentUserId; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    public BigDecimal getSpeedKmph() { return speedKmph; }
    public void setSpeedKmph(BigDecimal speedKmph) { this.speedKmph = speedKmph; }
    public Integer getEtaMinutes() { return etaMinutes; }
    public void setEtaMinutes(Integer etaMinutes) { this.etaMinutes = etaMinutes; }
    public OrderStatus getOrderStatus() { return orderStatus; }
    public void setOrderStatus(OrderStatus orderStatus) { this.orderStatus = orderStatus; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}

