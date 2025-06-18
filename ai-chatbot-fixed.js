// AI Chatbot functionality using OpenAI API
// Provides intelligent assistance for HR leave management queries

class AIChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.currentUser = null;
        this.isTyping = false;
        this.knowledgeBase = this.initializeKnowledgeBase();
        
        this.init();
        this.setupEventListeners();
        this.loadInitialMessage();
    }

    init() {
        this.chatbotToggle = document.getElementById('chatbot-toggle');
        this.chatbotPanel = document.getElementById('chatbot-panel');
        this.chatbotMinimize = document.getElementById('chatbot-minimize');
        this.chatbotMessages = document.getElementById('chatbot-messages');
        this.chatbotInput = document.getElementById('chatbot-input');
        this.chatbotSend = document.getElementById('chatbot-send');
    }

    setupEventListeners() {
        this.chatbotToggle.addEventListener('click', () => this.toggleChatbot());
        this.chatbotMinimize.addEventListener('click', () => this.closeChatbot());
        this.chatbotSend.addEventListener('click', () => this.sendMessage());
        
        this.chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.chatbotInput.addEventListener('input', () => {
            this.chatbotSend.disabled = !this.chatbotInput.value.trim();
        });
    }

    loadInitialMessage() {
        const welcomeMessage = {
            type: 'bot',
            content: 'Hello! I\'m your HR assistant. I can help you with leave policies, balance inquiries, and general questions. How can I assist you today?',
            timestamp: new Date()
        };
        
        this.messages.push(welcomeMessage);
        this.renderMessage(welcomeMessage);
    }

    toggleChatbot() {
        if (this.isOpen) {
            this.closeChatbot();
        } else {
            this.openChatbot();
        }
    }

    openChatbot() {
        this.isOpen = true;
        this.chatbotPanel.classList.add('show');
        this.chatbotToggle.innerHTML = '<i class="fas fa-times"></i>';
        this.chatbotInput.focus();
    }

    closeChatbot() {
        this.isOpen = false;
        this.chatbotPanel.classList.remove('show');
        this.chatbotToggle.innerHTML = '<i class="fas fa-robot"></i>';
    }

    async sendMessage() {
        const message = this.chatbotInput.value.trim();
        if (!message) return;

        // Add user message
        const userMessage = {
            type: 'user',
            content: message,
            timestamp: new Date()
        };
        
        this.messages.push(userMessage);
        this.renderMessage(userMessage);
        this.chatbotInput.value = '';
        this.chatbotSend.disabled = true;

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get AI response
            const botResponse = await this.getOpenAIResponse(message);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add bot message
            const botMessage = {
                type: 'bot',
                content: botResponse,
                timestamp: new Date()
            };
            
            this.messages.push(botMessage);
            this.renderMessage(botMessage);
            
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.hideTypingIndicator();
            
            const errorMessage = {
                type: 'bot',
                content: 'I apologize, but I\'m having trouble connecting to my knowledge base right now. Please try again in a moment, or contact HR directly for immediate assistance.',
                timestamp: new Date()
            };
            
            this.messages.push(errorMessage);
            this.renderMessage(errorMessage);
        }
    }

    async getOpenAIResponse(userMessage) {
        // Get current user context
        const user = window.FirebaseConfig && window.FirebaseConfig.getCurrentUser ? window.FirebaseConfig.getCurrentUser() : null;
        const userRole = window.FirebaseConfig ? window.FirebaseConfig.userRole : 'employee';
        
        // Get user's leave balance if available
        let leaveBalance = null;
        if (user && window.FirebaseConfig && window.FirebaseConfig.firestoreService) {
            try {
                leaveBalance = await window.FirebaseConfig.firestoreService.getLeaveBalance(user.uid);
            } catch (error) {
                console.log('Could not fetch leave balance for context');
            }
        }

        // Prepare context for intelligent response
        const context = this.buildContext(user, userRole, leaveBalance);
        
        // Use OpenAI for intelligent responses
        return await this.callOpenAI(userMessage, context);
    }

    buildContext(user, userRole, leaveBalance) {
        let context = {
            userRole: userRole || 'employee',
            currentDate: new Date().toISOString().split('T')[0],
            companyPolicies: {
                vacation: {
                    annual: 25,
                    maxCarryover: 5,
                    advanceBooking: 30
                },
                sick: {
                    annual: 10,
                    doctorNote: 3,
                    consecutive: true
                },
                personal: {
                    annual: 5,
                    advanceNotice: 24
                },
                maternity: {
                    duration: 90,
                    advance: 60
                },
                emergency: {
                    annual: 3,
                    noAdvanceRequired: true
                }
            }
        };

        if (user) {
            context.user = {
                name: user.displayName || user.email,
                email: user.email
            };
        }

        if (leaveBalance) {
            context.leaveBalance = leaveBalance;
        }

        return context;
    }

    // OpenAI integration for intelligent responses
    async callOpenAI(userMessage, context) {
        try {
            // Build context-aware prompt for the AI
            const systemPrompt = this.buildSystemPrompt(context);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user', 
                            content: userMessage
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.7,
                    top_p: 0.9
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data?.choices?.[0]?.message?.content) {
                return data.choices[0].message.content.trim();
            } else {
                return this.getFallbackResponse(userMessage, context);
            }
        } catch (error) {
            console.error('OpenAI API error:', error);
            // Fallback to rule-based system if API fails
            return this.getFallbackResponse(userMessage, context);
        }
    }

    buildSystemPrompt(context) {
        const kb = this.knowledgeBase;
        
        return `You are an intelligent HR assistant for a company's leave management system. 

Context:
- User role: ${context.userRole}
- Current date: ${context.currentDate}

Company Leave Policies:
- Vacation: ${kb.leaveTypes.vacation.annual} days annually, ${kb.leaveTypes.vacation.advanceNotice} days advance notice
- Sick Leave: ${kb.leaveTypes.sick.annual} days annually, doctor's note after ${kb.leaveTypes.sick.doctorNote} consecutive days
- Personal: ${kb.leaveTypes.personal.annual} days annually, ${kb.leaveTypes.personal.advanceNotice} hours advance notice
- Maternity/Paternity: ${kb.leaveTypes.maternity.duration} days, ${kb.leaveTypes.maternity.advanceNotice} days advance notice
- Emergency: ${kb.leaveTypes.emergency.annual} days annually, no advance notice required

${context.leaveBalance ? `User's Current Balance:
- Vacation: ${context.leaveBalance.vacation - (context.leaveBalance.used?.vacation || 0)} days remaining
- Sick: ${context.leaveBalance.sick - (context.leaveBalance.used?.sick || 0)} days remaining
- Personal: ${context.leaveBalance.personal - (context.leaveBalance.used?.personal || 0)} days remaining` : ''}

Provide helpful, professional responses about leave policies, procedures, and general HR questions. Keep responses concise and actionable.`;
    }

    // Initialize comprehensive knowledge base for intelligent responses
    initializeKnowledgeBase() {
        return {
            greetings: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
            farewells: ['bye', 'goodbye', 'see you', 'thank you', 'thanks'],
            
            leaveTypes: {
                vacation: {
                    name: 'Vacation Leave',
                    annual: 25,
                    advanceNotice: 30,
                    description: 'Planned time off for rest and recreation'
                },
                sick: {
                    name: 'Sick Leave',
                    annual: 10,
                    doctorNote: 3,
                    description: 'Time off for illness or medical appointments'
                },
                personal: {
                    name: 'Personal Leave',
                    annual: 5,
                    advanceNotice: 24,
                    description: 'Personal matters that require time off'
                },
                maternity: {
                    name: 'Maternity/Paternity Leave',
                    duration: 90,
                    advanceNotice: 60,
                    description: 'Leave for new parents'
                },
                emergency: {
                    name: 'Emergency Leave',
                    annual: 3,
                    advanceNotice: 0,
                    description: 'Immediate time off for emergencies'
                }
            }
        };
    }

    // Fallback intelligent response system
    getFallbackResponse(userMessage, context) {
        const message = userMessage.toLowerCase();
        const kb = this.knowledgeBase;
        
        // Handle greetings
        if (kb.greetings.some(greeting => message.includes(greeting))) {
            const userName = context.user ? context.user.name.split(' ')[0] : '';
            return `Hello ${userName}! I'm your HR assistant. I can help you with leave policies, check your balance, guide you through requests, and answer any HR questions. What would you like to know?`;
        }
        
        // Handle farewells
        if (kb.farewells.some(farewell => message.includes(farewell))) {
            return `You're welcome! Feel free to ask me anything about leave policies or HR procedures anytime. Have a great day!`;
        }
        
        // Leave balance queries
        if (message.includes('balance') || message.includes('days left') || message.includes('remaining')) {
            if (context.leaveBalance) {
                const balance = context.leaveBalance;
                const availableVacation = balance.vacation - (balance.used?.vacation || 0);
                const availableSick = balance.sick - (balance.used?.sick || 0);
                const availablePersonal = balance.personal - (balance.used?.personal || 0);
                
                return `Your Current Leave Balance:

Vacation Days: ${availableVacation} of ${balance.vacation} remaining
Sick Leave: ${availableSick} of ${balance.sick} remaining  
Personal Days: ${availablePersonal} of ${balance.personal} remaining

Need help planning your time off or have questions about any specific leave type?`;
            } else {
                return `I'd be happy to help you check your leave balance! Please make sure you're logged in so I can access your account information and retrieve your current balance.`;
            }
        }
        
        // Default helpful response
        return `I'm here to help with all your leave management questions! I can assist with:

Leave Policies - Rules and guidelines
Balance Inquiries - Check remaining days  
Request Process - How to submit requests
Approval Status - Track your requests
Conflict Resolution - Avoid scheduling issues

What specific topic would you like to explore?`;
    }

    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = message.type === 'bot' ? 'bot-message' : 'user-message';
        
        const timestamp = message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.innerHTML = `
            <div class="message-content">${message.content}</div>
            <div class="message-time">${timestamp}</div>
        `;
        
        this.chatbotMessages.appendChild(messageDiv);
        this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'bot-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        this.chatbotMessages.appendChild(typingDiv);
        this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for configuration to load
    if (window.CONFIG_LOADED) {
        window.chatbot = new AIChatbot();
    } else {
        window.addEventListener('configLoaded', function() {
            window.chatbot = new AIChatbot();
        });
    }
});