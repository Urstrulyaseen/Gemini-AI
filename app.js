// DOM Elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const historyList = document.getElementById('history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const chatTitle = document.getElementById('chat-title');
const themeToggle = document.getElementById('theme-toggle');
const rateLimitAlert = document.getElementById('rate-limit-alert');

// State
let conversations = JSON.parse(localStorage.getItem('conversations')) || [];
let currentConversationId = null;
let isProcessing = false;

// Initialize the app
function init() {
    // Set up theme
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    // Load conversations
    loadConversations();
    
    // Create a new chat if none exists
    if (conversations.length === 0) {
        createNewChat();
    } else {
        // Load the most recent conversation
        currentConversationId = conversations[0].id;
        renderMessages(conversations[0].messages);
        updateChatTitle(conversations[0].title);
    }
    
    // Set up event listeners
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter (without Shift)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // New chat button
    newChatBtn.addEventListener('click', createNewChat);
    
    // Clear chat button
    clearChatBtn.addEventListener('click', clearCurrentChat);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
}

// Auto-resize textarea
function autoResizeTextarea() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
}

// Toggle dark/light theme
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    if (isDark) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Create a new chat
function createNewChat() {
    const newConversation = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: []
    };
    
    conversations.unshift(newConversation);
    currentConversationId = newConversation.id;
    saveConversations();
    renderMessages([]);
    updateChatTitle('New Chat');
    updateHistoryList();
    messageInput.focus();
}

// Clear current chat
function clearCurrentChat() {
    if (!currentConversationId) return;
    
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages = [];
        saveConversations();
        renderMessages([]);
        updateChatTitle('New Chat');
        updateHistoryList();
    }
}

// Update chat title
function updateChatTitle(title) {
    chatTitle.textContent = title;
}

// Update history list in sidebar
function updateHistoryList() {
    historyList.innerHTML = '';
    
    conversations.forEach(conv => {
        const title = conv.messages.length > 0 
            ? (conv.messages[0].text.length > 30 
                ? conv.messages[0].text.substring(0, 30) + '...' 
                : conv.messages[0].text)
            : 'New Chat';
            
        const item = document.createElement('div');
        item.className = `sidebar-item p-3 rounded-lg cursor-pointer flex items-center ${currentConversationId === conv.id ? 'active' : ''}`;
        item.innerHTML = `
            <i class="fas fa-message mr-3 text-gray-400"></i>
            <span class="truncate">${title}</span>
        `;
        item.dataset.id = conv.id;
        item.addEventListener('click', () => loadConversation(conv.id));
        historyList.appendChild(item);
    });
}

// Load a conversation
function loadConversation(id) {
    currentConversationId = id;
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
        renderMessages(conversation.messages);
        updateChatTitle(conversation.title || 'New Chat');
        updateHistoryList();
    }
}

// Render messages in the chat container
function renderMessages(messages) {
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        // Show welcome message
        messagesContainer.innerHTML = `
            <div class="message-bubble ai-bubble max-w-3xl rounded-2xl p-4 shadow-sm">
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-robot text-white"></i>
                    </div>
                    <div>
                        <p class="mb-2">Hello! I'm your Gemini AI assistant. How can I help you today?</p>
                        <div class="flex flex-wrap gap-2 mt-3">
                            <span class="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">Explain quantum computing</span>
                            <span class="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">Write a poem about AI</span>
                            <span class="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">Help with coding</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    messages.forEach(msg => {
        const isUser = msg.sender === 'user';
        const bubbleClass = isUser ? 'user-bubble' : 'ai-bubble';
        const icon = isUser ? 'fa-user' : 'fa-robot';
        const bgColor = isUser ? 'bg-primary-500' : 'bg-primary-500';
        
        // Process markdown and code blocks
        let processedContent = msg.text;
        if (!isUser) {
            processedContent = marked.parse(msg.text);
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message-bubble ${bubbleClass} max-w-3xl rounded-2xl p-4 shadow-sm`;
        messageElement.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
                    <i class="fas ${icon} text-white"></i>
                </div>
                <div class="prose prose-invert dark:prose-invert max-w-none">
                    ${processedContent}
                </div>
                ${!isUser ? `
                    <button class="copy-btn p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ml-2 flex-shrink-0" title="Copy response">
                        <i class="fas fa-copy text-gray-500"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
    });
    
    // Add copy functionality to AI messages
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', copyResponse);
    });
    
    // Apply syntax highlighting
    document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
    });
    
    // Scroll to bottom
    scrollToBottom();
}

// Copy AI response to clipboard
function copyResponse(e) {
    const messageElement = e.target.closest('.message-bubble');
    const content = messageElement.querySelector('.prose').innerText;
    
    navigator.clipboard.writeText(content).then(() => {
        // Show feedback
        const originalIcon = e.target.innerHTML;
        e.target.innerHTML = '<i class="fas fa-check text-green-500"></i>';
        setTimeout(() => {
            e.target.innerHTML = originalIcon;
        }, 2000);
    });
}

// Send message to Gemini API
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isProcessing) return;
    
    isProcessing = true;
    messageInput.value = '';
    autoResizeTextarea.call(messageInput);
    sendBtn.disabled = true;
    
    // Add user message to UI
    addMessageToUI(text, 'user');
    
    // Add typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message-bubble ai-bubble max-w-3xl rounded-2xl p-4 shadow-sm';
    typingIndicator.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-white"></i>
            </div>
            <div>
                <div class="typing-indicator-container flex">
                    <div class="typing-indicator"></div>
                    <div class="typing-indicator"></div>
                    <div class="typing-indicator"></div>
                </div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typingIndicator);
    scrollToBottom();
    
    try {
        // Get the conversation
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (!conversation) return;
        
        // Add user message to conversation
        conversation.messages.push({ sender: 'user', text });
        
        // Prepare messages for API
        const apiMessages = conversation.messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
        
        // Call Gemini API
        const response = await callGeminiAPI(apiMessages);
        
        // Remove typing indicator
        typingIndicator.remove();
        
        // Add AI response to UI and conversation
        addMessageToUI(response, 'ai');
        conversation.messages.push({ sender: 'ai', text: response });
        
        // Update conversation title if it's the first message
        if (conversation.messages.length === 2) {
            conversation.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
            updateChatTitle(conversation.title);
            updateHistoryList();
        }
        
        // Save conversations
        saveConversations();
    } catch (error) {
        // Remove typing indicator
        typingIndicator.remove();
        
        // Handle errors
        if (error.message.includes('429')) {
            showRateLimitAlert();
        } else {
            addMessageToUI("Sorry, I encountered an error. Please try again.", 'ai');
        }
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Add message to UI
function addMessageToUI(text, sender) {
    const isUser = sender === 'user';
    const bubbleClass = isUser ? 'user-bubble' : 'ai-bubble';
    const icon = isUser ? 'fa-user' : 'fa-robot';
    const bgColor = isUser ? 'bg-primary-500' : 'bg-primary-500';
    
    // Process markdown for AI messages
    let processedContent = text;
    if (!isUser) {
        processedContent = marked.parse(text);
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message-bubble ${bubbleClass} max-w-3xl rounded-2xl p-4 shadow-sm animate-fadeIn`;
    messageElement.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
                <i class="fas ${icon} text-white"></i>
            </div>
            <div class="prose prose-invert dark:prose-invert max-w-none">
                ${processedContent}
            </div>
            ${!isUser ? `
                <button class="copy-btn p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ml-2 flex-shrink-0" title="Copy response">
                    <i class="fas fa-copy text-gray-500"></i>
                </button>
            ` : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // Add copy functionality
    if (!isUser) {
        const copyBtn = messageElement.querySelector('.copy-btn');
        copyBtn.addEventListener('click', copyResponse);
    }
    
    // Apply syntax highlighting
    if (!isUser) {
        document.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }
    
    scrollToBottom();
}

// Call Gemini API
async function callGeminiAPI(messages) {
    // In a real implementation, you would use your actual API key
    // For this demo, we'll simulate an API call
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulate different responses based on input
            const lastMessage = messages[messages.length - 1].parts[0].text.toLowerCase();
            
            if (lastMessage.includes('hello') || lastMessage.includes('hi')) {
                resolve("Hello there! How can I assist you today?");
            } else if (lastMessage.includes('help')) {
                resolve("I'm here to help! You can ask me questions, request explanations, or even ask for code examples. What would you like to do?");
            } else if (lastMessage.includes('code') || lastMessage.includes('programming')) {
                resolve("Here's a simple JavaScript function to calculate factorial:\n\n```javascript\nfunction factorial(n) {\n  if (n === 0 || n === 1) {\n    return 1;\n  }\n  return n * factorial(n - 1);\n}\n\nconsole.log(factorial(5)); // Output: 120\n```\n\nLet me know if you need help with anything specific!");
            } else if (lastMessage.includes('poem')) {
                resolve("Here's a short poem about AI:\n\n*Silicon thoughts in circuits deep,\nWhere algorithms softly sleep.\nAwakened by a human quest,\nTo solve problems and do our best.\n\nWith data streams and neural nets,\nNo challenge that it can't begets.\nA digital mind, both vast and keen,\nIn service to what we have seen.*");
            } else {
                resolve("I understand your query. Based on my knowledge, here's what I can tell you about that topic. Remember that I'm an AI assistant and my knowledge has limitations. Is there anything specific you'd like me to elaborate on?");
            }
        }, 1000 + Math.random() * 1000);
    });
    
    /*
    // Real API implementation would look like this:
    const API_KEY = 'YOUR_API_KEY';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: messages
        })
    });
    
    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Rate limit exceeded');
        }
        throw new Error('API request failed');
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
    */
}

// Show rate limit alert
function showRateLimitAlert() {
    rateLimitAlert.classList.remove('hidden');
    setTimeout(() => {
        rateLimitAlert.classList.add('hidden');
    }, 5000);
}

// Save conversations to localStorage
function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
}

// Load conversations from localStorage
function loadConversations() {
    conversations = JSON.parse(localStorage.getItem('conversations')) || [];
    updateHistoryList();
}

// Scroll to bottom of messages container
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);