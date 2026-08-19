import React, { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { Send, User, Bot, HeadphonesIcon } from 'lucide-react';

export default function LiveSupportTab() {
  const [messages, setMessages] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [input, setInput] = useState('');
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = import.meta.env.VITE_API_BASE_URL?.replace('http', 'ws') || 'ws://localhost:8081';

    const client = new Client({
      brokerURL: `/ws`,
      connectHeaders: { Authorization: `Bearer ` },
      onConnect: () => {
        console.log('Admin STOMP connected');
        client.subscribe('/topic/admin/chat', (message) => {
          if (message.body) {
            const body = JSON.parse(message.body);
            setMessages(prev => [...prev, body]);
            if (!activeUser) setActiveUser(body.senderEmail);
          }
        });
      }
    });

    client.activate();
    setStompClient(client);
    return () => client.deactivate();
  }, [activeUser]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeUser || !stompClient) return;

    const msg = { text: input, senderEmail: activeUser };
    stompClient.publish({
      destination: '/app/chat.replyToUser',
      body: JSON.stringify(msg)
    });

    setMessages(prev => [...prev, { ...msg, isAdmin: true }]);
    setInput('');
  };

  return (
    <div className="bg-white rounded-[2rem] border border-[#EADDCD] p-6 h-[70vh] flex flex-col">
      <div className="flex items-center gap-3 mb-4 border-b border-[#EADDCD] pb-4">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
          <HeadphonesIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#780116] font-display">Live Support Dashboard</h2>
          <p className="text-sm text-[#8E7B73] font-medium">Chat directly with users escalated by AI</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">Waiting for live chat requests...</div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={"flex "}>
              <div className={"max-w-[70%] p-3 rounded-2xl "}>
                {!msg.isAdmin && <p className="text-xs font-bold text-[#F7B538] mb-1">{msg.senderName} ({msg.senderEmail})</p>}
                {msg.imageUrl && <img src={msg.imageUrl} alt="User uploaded" className="w-full rounded-lg mb-2" />} 
                <p className="text-sm font-medium">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={activeUser ? "Reply to ..." : "Waiting for user..."}
          disabled={!activeUser}
          className="flex-1 px-4 py-3 bg-[#FFFCF5] border border-[#EADDCD] rounded-xl focus:border-[#F7B538] outline-none"
        />
        <button type="submit" disabled={!activeUser} className="px-6 bg-[#780116] text-white rounded-xl hover:bg-[#5a0010] transition-colors disabled:opacity-50">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}