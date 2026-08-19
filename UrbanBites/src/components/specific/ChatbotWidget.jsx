import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Paperclip, HeadphonesIcon, Package, UtensilsCrossed, XCircle, RotateCcw, Clock, Sparkles, ChevronRight, Star } from 'lucide-react';
import { chatbotApi } from '../../api/chatbotApi';
import { customerOrderApi } from '../../api/orderApi';
import { useAuthStore } from '../../store/authStore';
import { Client } from '@stomp/stompjs';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

// -- Helper: Resolve image path to full URL --
const resolveImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE}${path}`;
};

// -- Helper: Format bot text with **bold** and \n line breaks --
const FormattedText = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIdx} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </React.Fragment>
    );
  });
};

// -- Helper: Status badge color mapping --
const getStatusStyle = (status) => {
  const s = (status || '').toUpperCase();
  if (s === 'DELIVERED') return { bg: '#E8F5E9', text: '#2E7D32', label: '✅ Delivered' };
  if (s === 'OUT_FOR_DELIVERY') return { bg: '#E3F2FD', text: '#1565C0', label: '🚗 Out for Delivery' };
  if (s === 'PREPARING') return { bg: '#FFF3E0', text: '#E65100', label: '🍳 Preparing' };
  if (s === 'CREATED') return { bg: '#F3E5F5', text: '#7B1FA2', label: '🆕 Created' };
  if (s === 'CANCELLED') return { bg: '#FFEBEE', text: '#C62828', label: '❌ Cancelled' };
  if (s === 'CONFIRMED') return { bg: '#E8F5E9', text: '#2E7D32', label: '✔ Confirmed' };
  if (s === 'ACCEPTED_BY_RESTAURANT') return { bg: '#FFF3E0', text: '#E65100', label: '👨‍🍳 Accepted' };
  if (s === 'READY_FOR_PICKUP') return { bg: '#E3F2FD', text: '#1565C0', label: '📦 Ready' };
  return { bg: '#F5F5F5', text: '#616161', label: status || 'Unknown' };
};

// -- Single Order Card (non-clickable, for reference display) --
const OrderCard = ({ card }) => {
  if (!card) return null;
  const statusStyle = getStatusStyle(card.status);
  const imgUrl = resolveImageUrl(card.restaurantImage);
  return (
    <div style={{
      marginTop: '10px',
      background: 'linear-gradient(135deg, #FFFCF5 0%, #FFF8E7 100%)',
      border: '1px solid #F0E6D3',
      borderRadius: '12px',
      padding: '10px',
      boxShadow: '0 2px 6px rgba(120, 1, 22, 0.04)',
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
    }}>
      {/* Small Restaurant Thumbnail */}
      {imgUrl ? (
        <img src={imgUrl} alt={card.restaurant} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#780116' }}>
          <UtensilsCrossed size={18} />
        </div>
      )}
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#2A0800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.restaurant}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#2A0800' }}>
            {card.total}
          </span>
        </div>
        
        {card.items && (
          <div style={{ fontSize: '11px', color: '#7a6a5f', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.items}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: statusStyle.text, background: statusStyle.bg, padding: '2px 6px', borderRadius: '12px' }}>
            {statusStyle.label}
          </span>
          {card.createdAt && (
            <span style={{ fontSize: '10px', color: '#9e8e80', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={10} /> {card.createdAt}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// -- Clickable Order Picker Card (user taps to select) --
const OrderPickerCard = ({ card, onSelect }) => {
  const statusStyle = getStatusStyle(card.status);
  const imgUrl = resolveImageUrl(card.restaurantImage);
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(card)}
      style={{
        width: '100%',
        background: '#FFFFFF',
        border: '1.5px solid #EDE3D5',
        borderRadius: '12px',
        padding: '10px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#780116'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#EDE3D5'; }}
    >
      {/* Small Restaurant Thumbnail */}
      {imgUrl ? (
        <img src={imgUrl} alt={card.restaurant} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#780116' }}>
          <UtensilsCrossed size={18} />
        </div>
      )}
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#2A0800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.restaurant}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#2A0800' }}>
            {card.total}
          </span>
        </div>
        
        {card.items && (
          <div style={{ fontSize: '11px', color: '#7a6a5f', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.items}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: statusStyle.text, background: statusStyle.bg, padding: '2px 6px', borderRadius: '12px' }}>
            {statusStyle.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {card.createdAt && (
              <span style={{ fontSize: '10px', color: '#9e8e80' }}>{card.createdAt}</span>
            )}
            <ChevronRight size={12} style={{ color: '#780116', opacity: 0.5 }} />
          </div>
        </div>
      </div>
    </motion.button>
  );
};

// -- Default Quick Action Chips --
const DEFAULT_ACTIONS = [
  { label: '🍕 Food Quality Issue', message: 'I have a food quality issue with my order' },
  { label: '🎧 Speak to Agent', message: 'Connect me to a human agent' },
];

const ACTIVE_ORDER_ACTIONS = [
  { label: '📦 Track My Order', message: 'Where is my current order?' },
  { label: '❌ Cancel Order', message: 'I want to cancel my order' },
  { label: '🎧 Speak to Agent', message: 'Connect me to a human agent' },
];

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your UrbanBites support assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresImage, setRequiresImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLiveAgent, setIsLiveAgent] = useState(false);
  const [stompClient, setStompClient] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [quickActions, setQuickActions] = useState(DEFAULT_ACTIONS);
  const [showCsat, setShowCsat] = useState(false);
  const [csatRating, setCsatRating] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const { isAuthenticated } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !stompClient) {
      connectWebSocket(true);
      // Fetch recent orders to set dynamic quick actions
      customerOrderApi.listMyOrders()
        .then(res => {
          const hasActiveOrder = res.some(o => 
            !['DELIVERED', 'CANCELLED', 'CREATED', 'PENDING_PAYMENT'].includes(o.status)
          );
          if (hasActiveOrder) {
            setQuickActions(ACTIVE_ORDER_ACTIONS);
          } else {
            setQuickActions(DEFAULT_ACTIONS);
          }
        })
        .catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [stompClient]);

  const connectWebSocket = (silent = false) => {
    if (stompClient && stompClient.connected) {
      if (!silent && !isLiveAgent) {
        setIsLiveAgent(true);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "You are now connected to a live support agent.",
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = import.meta.env.VITE_API_BASE_URL?.replace('http', 'ws') || 'ws://localhost:8081';
    
    const client = new Client({
      brokerURL: `${wsUrl}/ws`,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: function (str) {
        console.log('STOMP: ' + str);
      },
      onConnect: () => {
        if (!silent) {
          setIsLiveAgent(true);
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: "You are now connected to a live support agent.",
            sender: 'bot',
            timestamp: new Date(),
          }]);
        }

        client.subscribe('/user/queue/chat', (message) => {
          if (message.body) {
            const body = JSON.parse(message.body);
            if (body.type === 'CSAT_REQUEST') {
              setShowCsat(true);
              return;
            }
            setMessages(prev => [...prev, {
              id: Date.now(),
              text: body.text,
              sender: 'bot',
              senderName: body.senderName || 'Support Agent',
              timestamp: new Date(),
            }]);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      }
    });

    client.activate();
    setStompClient(client);
  };

  const handleClearChat = useCallback(() => {
    setMessages([
      {
        id: Date.now(),
        text: "Hi! I'm your UrbanBites support assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date(),
      }
    ]);
    setShowQuickActions(true);
    setRequiresImage(false);
    setSelectedImage(null);
  }, []);

  const handleSend = async (e, overrideMessage) => {
    if (e) e.preventDefault();
    const messageText = overrideMessage || input.trim();
    if (!messageText && !selectedImage) return;

    if (!isAuthenticated) {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: "Please log in to chat with support.", 
        sender: 'bot',
        timestamp: new Date(),
      }]);
      setInput('');
      return;
    }

    setShowQuickActions(false);

    const userMsg = messageText;
    let localImageUrl = null;
    let backendImageUrl = null;

    if (selectedImage) {
      localImageUrl = URL.createObjectURL(selectedImage);
    }

    setInput('');
    setSelectedImage(null);
    setRequiresImage(false);
    
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      text: userMsg || "Uploaded an image", 
      sender: 'user',
      imageUrl: localImageUrl,
      timestamp: new Date(),
    }]);
    setIsLoading(true);

    try {
      if (selectedImage) {
        const uploadRes = await chatbotApi.uploadImage(selectedImage);
        backendImageUrl = uploadRes.imageUrl;
      }
      
      if (isLiveAgent && stompClient && stompClient.connected) {
        stompClient.publish({
          destination: '/app/chat.sendToAdmin',
          body: JSON.stringify({ text: userMsg || "Sent an image", imageUrl: backendImageUrl })
        });
        setIsLoading(false);
        return;
      }
      const chatHistoryText = messages.slice(-4).map(m => `${m.sender}: ${m.text}`).join('\n');
      const response = await chatbotApi.sendMessage(userMsg || "Here is the photo.", chatHistoryText, null, backendImageUrl);
      
      if (response.requiresImage) {
        setRequiresImage(true);
      }

      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: response.reply, 
        sender: 'bot',
        action: response.action,
        suggestedReplies: response.suggestedReplies,
        orderCard: response.orderCard,
        orderCards: response.orderCards,
        showOrderPicker: response.showOrderPicker,
        timestamp: new Date(),
      }]);

      if (response.action === "HUMAN_HANDOFF") {
        connectWebSocket(false);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: "Sorry, I'm having trouble connecting to the server. Please try again later.", 
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // When user selects an order from the order picker
  const handleOrderSelect = (card) => {
    const selectionMessage = `I'm referring to my order #${card.id} from ${card.restaurant} (${card.items})`;
    handleSend(null, selectionMessage);
  };

  const handleQuickAction = (action) => {
    if (action.message === 'Connect me to a human agent') {
      connectWebSocket(false);
      setShowQuickActions(false);
      return;
    }
    handleSend(null, action.message);
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl flex items-center justify-center transition-all"
            style={{
              background: 'linear-gradient(135deg, #780116 0%, #a01030 100%)',
              color: '#FFFCF5',
              boxShadow: '0 10px 30px rgba(120, 1, 22, 0.45), 0 0 0 4px rgba(247, 181, 56, 0.15)',
            }}
          >
            <Sparkles size={14} style={{ position: 'absolute', top: 6, right: 6, opacity: 0.7 }} />
            <MessageSquare size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden"
            style={{
              width: '380px',
              height: '540px',
              maxHeight: '85vh',
              background: '#FFFCF5',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(120, 1, 22, 0.18), 0 0 0 1px rgba(120, 1, 22, 0.08)',
              border: '1px solid rgba(240, 230, 211, 0.6)',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #780116 0%, #9a0a2a 50%, #780116 100%)',
              color: '#FFFCF5',
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(120, 1, 22, 0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isLiveAgent
                    ? 'linear-gradient(135deg, #43A047, #66BB6A)'
                    : 'linear-gradient(135deg, #FFFCF5, #FFF3D6)',
                  color: isLiveAgent ? '#fff' : '#780116',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                  {isLiveAgent ? <HeadphonesIcon size={22} /> : <Bot size={22} />}
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', lineHeight: '1.2', margin: 0, letterSpacing: '-0.02em' }}>
                    {isLiveAgent ? 'Live Support' : 'UrbanBites Support'}
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'rgba(255,252,245,0.65)', margin: 0, marginTop: '2px' }}>
                    {isLiveAgent ? '● Connected to human agent' : '● Typically replies instantly'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  style={{
                    background: 'rgba(255,252,245,0.12)', border: 'none', borderRadius: '8px',
                    color: 'rgba(255,252,245,0.7)', padding: '6px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,252,245,0.22)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,252,245,0.12)'; e.currentTarget.style.color = 'rgba(255,252,245,0.7)'; }}
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255,252,245,0.12)', border: 'none', borderRadius: '8px',
                    color: 'rgba(255,252,245,0.7)', padding: '6px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,252,245,0.22)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,252,245,0.12)'; e.currentTarget.style.color = 'rgba(255,252,245,0.7)'; }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'linear-gradient(180deg, #F9F5EE 0%, #FFFCF5 100%)',
            }}>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '12px 16px',
                    boxShadow: msg.sender === 'user'
                      ? '0 2px 8px rgba(247, 181, 56, 0.2)'
                      : '0 2px 8px rgba(0,0,0,0.05)',
                    background: msg.sender === 'user' 
                      ? 'linear-gradient(135deg, #F7B538 0%, #F9C762 100%)' 
                      : '#FFFFFF',
                    color: msg.sender === 'user' ? '#2A0800' : '#3D2C24',
                    border: msg.sender === 'user' ? 'none' : '1px solid #F0E6D3',
                  }}>
                    {/* Sender label for live agent */}
                    {msg.senderName && (
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#780116', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {msg.senderName}
                      </div>
                    )}
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Attachment" style={{ maxWidth: '100%', height: 'auto', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(0,0,0,0.08)' }} />
                    )}
                    <p style={{ fontSize: '13.5px', lineHeight: '1.55', fontWeight: 500, margin: 0 }}>
                      {msg.sender === 'bot' ? <FormattedText text={msg.text} /> : msg.text}
                    </p>

                    {/* Single Order Card (reference) */}
                    {msg.orderCard && <OrderCard card={msg.orderCard} />}

                    {/* Action Badge */}
                    {msg.action && (
                      <div style={{
                        marginTop: '8px', fontSize: '11px',
                        background: msg.action === 'RAISE_DISPUTE' ? '#FFEBEE' : '#E8F5E9',
                        color: msg.action === 'RAISE_DISPUTE' ? '#C62828' : '#2E7D32',
                        padding: '4px 10px', borderRadius: '8px', display: 'inline-flex',
                        alignItems: 'center', gap: '4px', fontWeight: 600,
                      }}>
                        {msg.action === 'RAISE_DISPUTE' ? '🎫' : '✓'} {msg.action === 'RAISE_DISPUTE' ? 'Ticket Raised' : msg.action}
                      </div>
                    )}

                    {/* Suggested Replies */}
                    {msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {msg.suggestedReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              handleSend(null, reply);
                            }}
                            style={{
                              fontSize: '11.5px', fontWeight: 600,
                              padding: '6px 14px',
                              background: 'transparent',
                              color: '#780116',
                              border: '1.5px solid #780116',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#780116'; e.currentTarget.style.color = '#FFFCF5'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#780116'; }}
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Order Picker Cards (clickable, shown below the bot message) */}
                  {msg.showOrderPicker && msg.orderCards && msg.orderCards.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      width: '100%',
                      maxWidth: '85%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#9E8E80', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '4px' }}>
                        Tap to select an order
                      </span>
                      {msg.orderCards.map((card, idx) => (
                        <OrderPickerCard key={idx} card={card} onSelect={handleOrderSelect} />
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span style={{ fontSize: '10px', color: '#B0A090', marginTop: '4px', paddingLeft: '4px', paddingRight: '4px' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                  
                  {/* Action chips */}
                  {showQuickActions && index === messages.length - 1 && !requiresImage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-wrap gap-2 mt-4 ml-11"
                    >
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleQuickAction(action)}
                          className="bg-white border border-[#F0E6D3] text-[#7a6a5f] text-[11px] font-medium px-3 py-1.5 rounded-full hover:bg-[#FFFCF5] hover:border-[#F7B538] hover:text-[#780116] transition-all shadow-sm"
                        >
                          {action.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))}
              
              {/* Loading Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', justifyContent: 'flex-start' }}
                >
                  <div style={{
                    background: '#FFFFFF', border: '1px solid #F0E6D3',
                    borderRadius: '18px 18px 18px 4px',
                    padding: '14px 18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <div className="w-2 h-2 bg-[#780116] rounded-full animate-bounce" style={{ animationDelay: '0ms', opacity: 0.7 }} />
                    <div className="w-2 h-2 bg-[#780116] rounded-full animate-bounce" style={{ animationDelay: '150ms', opacity: 0.5 }} />
                    <div className="w-2 h-2 bg-[#780116] rounded-full animate-bounce" style={{ animationDelay: '300ms', opacity: 0.3 }} />
                  </div>
                </motion.div>
              )}

              {/* CSAT Card */}
              {showCsat && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-4 mt-2 p-4 bg-white rounded-xl shadow-sm border border-[#F0E6D3]"
                >
                  <div className="text-center mb-3 text-sm font-semibold text-[#2A0800]">
                    How was your support experience?
                  </div>
                  <div className="flex justify-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setCsatRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          fill={csatRating >= star ? '#F7B538' : 'none'}
                          color={csatRating >= star ? '#F7B538' : '#D4C5B9'}
                        />
                      </button>
                    ))}
                  </div>
                  {csatRating > 0 && (
                    <button
                      onClick={() => {
                        setShowCsat(false);
                        setMessages(prev => [...prev, {
                          id: Date.now(),
                          text: "Thank you for your feedback! 😊",
                          sender: 'bot',
                          timestamp: new Date()
                        }]);
                      }}
                      className="w-full bg-[#780116] text-white py-2 rounded-lg text-xs font-semibold"
                    >
                      Submit Feedback
                    </button>
                  )}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Selected Image Preview */}
            {selectedImage && (
              <div style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #FFF8E7, #FFFCF5)',
                borderTop: '1px solid #EDE3D5',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '12.5px', color: '#5A3E36', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                  📎 {selectedImage.name}
                </span>
                <button type="button" onClick={() => setSelectedImage(null)} style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                  <XCircle size={18} />
                </button>
              </div>
            )}

            {/* Input Area */}
            <form
              id="chat-form"
              onSubmit={(e) => handleSend(e)}
              style={{
                padding: '12px 14px',
                background: '#FFFFFF',
                borderTop: '1px solid #F0E6D3',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              {requiresImage && (
                <>
                  <input 
                    type="file" 
                    id="chatbot-file-upload"
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={(e) => setSelectedImage(e.target.files[0])} 
                    className="hidden" 
                  />
                  <label
                    htmlFor="chatbot-file-upload"
                    style={{
                      padding: '8px', color: '#9E8E80', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '10px', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#780116'; e.currentTarget.style.background = 'rgba(120,1,22,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#9E8E80'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Paperclip size={20} />
                  </label>
                </>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isAuthenticated ? "Type your message..." : "Please login to chat"}
                disabled={!isAuthenticated || isLoading}
                style={{
                  flex: 1,
                  background: '#F5F0E8',
                  border: '1.5px solid transparent',
                  outline: 'none',
                  borderRadius: '14px',
                  padding: '11px 16px',
                  fontSize: '13.5px',
                  color: '#3D2C24',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  opacity: (!isAuthenticated || isLoading) ? 0.5 : 1,
                }}
                onFocus={e => { e.target.style.borderColor = '#780116'; e.target.style.background = '#FFFCF5'; e.target.style.boxShadow = '0 0 0 3px rgba(120,1,22,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = '#F5F0E8'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || !isAuthenticated || isLoading}
                style={{
                  width: '42px', height: '42px',
                  background: ((!input.trim() && !selectedImage) || !isAuthenticated || isLoading)
                    ? '#E0D8CC'
                    : 'linear-gradient(135deg, #780116 0%, #a01030 100%)',
                  color: '#FFFCF5',
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none',
                  cursor: ((!input.trim() && !selectedImage) || !isAuthenticated || isLoading) ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  boxShadow: ((!input.trim() && !selectedImage) || !isAuthenticated || isLoading) ? 'none' : '0 3px 12px rgba(120,1,22,0.25)',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={18} style={{ marginLeft: '2px' }} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatbotWidget;
