import React, { useState } from 'react';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm ready to help you grade this essay. What would you like to know?", sender: 'bot' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user'
    };
    
    // Mock bot response
    const botMessage = {
      id: messages.length + 2,
      text: "This is a mock response. In the future, this will be replaced with actual LLM responses based on the PDF content.",
      sender: 'bot'
    };

    setMessages([...messages, userMessage, botMessage]);
    setInputMessage('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>PDF Assistant</h3>
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-content">
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask a question about the essay..."
          className="chat-input"
        />
        <button type="submit" className="chat-submit">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
