// AI Chatbot functionality using Hugging Face Inference API
// Provides intelligent assistance for HR leave management queries using free AI models

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
            const botResponse = await this.getAIResponse(message);
            
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

    async getAIResponse(userMessage) {
        // Get current user context
        const user = window.FirebaseConfig.getCurrentUser();
        const userRole = window.FirebaseConfig.userRole;
        
        // Get user's leave balance if available
        let leaveBalance = null;
        if (user) {
            try {
                leaveBalance = await window.FirebaseConfig.firestoreService.getLeaveBalance(user.uid);
            } catch (error) {
                console.log('Could not fetch leave balance for context');
            }
        }

        // Prepare context for intelligent response
        const context = this.buildContext(user, userRole, leaveBalance);
        
        // Use Hugging Face AI for intelligent responses
        return await this.getHuggingFaceResponse(userMessage, context);
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

    buildPrompt(userMessage, context) {
        return `You are an intelligent HR assistant for a company's leave management system. 
        
Context:
- User role: ${context.userRole}
- Current date: ${context.currentDate}
- Company leave policies: ${JSON.stringify(context.companyPolicies, null, 2)}
${context.leaveBalance ? `- User's leave balance: ${JSON.stringify(context.leaveBalance, null, 2)}` : ''}

User message: "${userMessage}"

Provide a helpful, professional, and accurate response about leave policies, procedures, or general HR questions. If the question is about specific leave balances or requests, use the provided context. Keep responses concise but informative. If you cannot answer a question definitively, direct the user to contact HR directly.

Response:`;
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
            },
            
            processes: {
                request: [
                    'Click the "Request Leave" button in your dashboard',
                    'Select the type of leave you need',
                    'Choose your start and end dates',
                    'Add a reason if required',
                    'Submit for HR approval'
                ],
                approval: [
                    'Your request is automatically sent to HR',
                    'HR reviews within 2-3 business days',
                    'You receive a notification with the decision',
                    'Approved leave appears on the calendar'
                ]
            },
            
            tips: {
                planning: [
                    'Book vacation 30 days in advance when possible',
                    'Check team calendar for conflicts',
                    'Consider peak business periods',
                    'Plan around project deadlines'
                ],
                emergency: [
                    'Contact your manager immediately',
                    'Submit the request as soon as possible',
                    'Provide documentation when you return'
                ]
            }
        };
    }

    // Hugging Face AI integration for intelligent responses
    async getHuggingFaceResponse(userMessage, context) {
        try {
            // Build context-aware prompt for the AI
            const systemPrompt = this.buildSystemPrompt(context);
            const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;

            // Call Hugging Face Inference API (free tier)
            const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // No API key needed for public models on free tier
                },
                body: JSON.stringify({
                    inputs: fullPrompt,
                    parameters: {
                        max_length: 200,
                        temperature: 0.7,
                        do_sample: true,
                        pad_token_id: 50256
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data && data[0] && data[0].generated_text) {
                // Extract the assistant's response
                const fullText = data[0].generated_text;
                const assistantResponse = fullText.split('Assistant:').pop().trim();
                return assistantResponse || this.getFallbackResponse(userMessage, context);
            } else {
                return this.getFallbackResponse(userMessage, context);
            }
        } catch (error) {
            console.error('Hugging Face API error:', error);
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
                
                return `**Your Current Leave Balance:**

**Vacation Days**: ${availableVacation} of ${balance.vacation} remaining
**Sick Leave**: ${availableSick} of ${balance.sick} remaining  
**Personal Days**: ${availablePersonal} of ${balance.personal} remaining

Need help planning your time off or have questions about any specific leave type?`;
            } else {
                return `I'd be happy to help you check your leave balance! Please make sure you're logged in so I can access your account information and retrieve your current balance.`;
            }
        }
        
        // Leave policy queries
        if (message.includes('policy') || message.includes('rule') || message.includes('how many')) {
            return `Here are our leave policies:

📅 **Vacation Leave**: 25 days annually, book 30 days in advance
🏥 **Sick Leave**: 10 days annually, doctor's note required for 3+ consecutive days
👤 **Personal Leave**: 5 days annually, 24-hour advance notice required
👶 **Maternity/Paternity**: 90 days available, notify 60 days in advance
🚨 **Emergency Leave**: 3 days annually, no advance notice required

Which policy would you like more details about?`;
        }
        
        // Request help
        if (message.includes('request') || message.includes('apply') || message.includes('submit')) {
            return `To request leave:

1. Click the "Request Leave" button in the dashboard
2. Select your leave type and dates
3. Add a brief reason (optional but recommended)
4. Submit for approval

💡 **Smart Tip**: I'll automatically check for conflicts and suggest better dates if needed!

Need help with a specific type of leave request?`;
        }
        
        // Approval process
        if (message.includes('approval') || message.includes('approve') || message.includes('pending')) {
            if (context.userRole === 'hr') {
                return `As an HR manager, you can:

✅ **Review Requests**: Check the "Leave Requests" tab
📊 **View Conflicts**: See overlapping requests in the calendar
🔔 **Get Notified**: Receive alerts for new requests
📈 **Generate Reports**: Access analytics in the Reports section

All pending requests are highlighted and ready for your review!`;
            } else {
                return `Leave approval process:

1. **Submitted** → Your request is sent to HR
2. **Under Review** → HR is reviewing your request  
3. **Approved/Rejected** → You'll be notified of the decision

⏱️ Most requests are processed within 2-3 business days. You can check the status in your dashboard under "Recent Requests".`;
            }
        }
        
        // Conflict detection
        if (message.includes('conflict') || message.includes('overlap') || message.includes('busy')) {
            return `Our smart scheduling system automatically:

🔍 **Detects Conflicts**: Checks for team overlaps
📅 **Suggests Alternatives**: Recommends better dates
⚠️ **Warns About Issues**: Highlights potential problems
📊 **Shows Team Calendar**: View who's out when

This helps ensure adequate coverage and smooth operations!`;
        }
        
        // Emergency leave
        if (message.includes('emergency') || message.includes('urgent')) {
            return `**Emergency Leave Policy**:

🚨 **No Advance Notice Required** - Can be used immediately
📞 **Notify ASAP** - Contact HR or your manager as soon as possible
📝 **Documentation** - Provide details when you return
⏳ **Duration** - 3 days annually available

For true emergencies, your well-being comes first. Don't hesitate to use this when needed.`;
        }
        
        // Sick leave specific
        if (message.includes('sick') || message.includes('medical') || message.includes('doctor')) {
            return `**Sick Leave Guidelines**:

🏥 **10 days annually** available
📋 **Doctor's note required** for 3+ consecutive days
🔄 **Can be used consecutively** without additional approval
📞 **Notify early** - Contact your manager before start of business day

Your health is important - don't come to work when you're unwell!`;
        }
        
        // Vacation planning
        if (message.includes('vacation') || message.includes('holiday') || message.includes('time off')) {
            return `**Vacation Planning Tips**:

📅 **Plan Ahead**: Book 30 days in advance when possible
🏖️ **Peak Seasons**: Summer and holidays fill up quickly
💡 **Smart Scheduling**: Use our suggestions to avoid conflicts
📊 **Balance Tracking**: Keep an eye on your remaining days

Want me to help you check the best times to take vacation based on team availability?`;
        }
        
        // Default helpful response
        return `I'm here to help with all your leave management questions! I can assist with:

📋 **Leave Policies** - Rules and guidelines
📅 **Balance Inquiries** - Check remaining days  
📝 **Request Process** - How to submit requests
⏰ **Approval Status** - Track your requests
🔍 **Conflict Resolution** - Avoid scheduling issues
📊 **Reporting** - Leave analytics and trends

What specific topic would you like to explore?`;
    }

    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = message.type === 'bot' ? 'bot-message' : 'user-message';
        
        const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (message.type === 'bot') {
            messageDiv.innerHTML = `
                <i class="fas fa-robot"></i>
                <div class="message-content">
                    <p>${this.formatMessage(message.content)}</p>
                </div>
            `;
        } else {
            const user = window.FirebaseConfig.getCurrentUser();
            const avatar = user?.photoURL || 'https://via.placeholder.com/32';
            
            messageDiv.innerHTML = `
                <img src="${avatar}" alt="User" class="user-avatar">
                <div class="message-content">
                    <p>${message.content}</p>
                </div>
            `;
        }
        
        this.chatbotMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'bot-message typing-indicator';
        typingDiv.innerHTML = `
            <i class="fas fa-robot"></i>
            <div class="message-content">
                <p>Typing<span class="dots">
                    <span>.</span><span>.</span><span>.</span>
                </span></p>
            </div>
        `;
        
        this.chatbotMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (!this.isTyping) return;
        
        this.isTyping = false;
        const typingIndicator = this.chatbotMessages.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
    }

    // Update user context when user changes
    updateUser(user, role) {
        this.currentUser = user;
        this.userRole = role;
    }

    // Clear chat history
    clearChat() {
        this.messages = [];
        this.chatbotMessages.innerHTML = '';
        this.loadInitialMessage();
    }
}

// Add typing animation CSS
const typingStyles = `
.typing-indicator .dots {
    display: inline-block;
}

.typing-indicator .dots span {
    opacity: 0;
    animation: typing 1.4s infinite;
}

.typing-indicator .dots span:nth-child(1) {
    animation-delay: 0s;
}

.typing-indicator .dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-indicator .dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing {
    0%, 60%, 100% {
        opacity: 0;
    }
    30% {
        opacity: 1;
    }
}
`;

// Inject typing styles
const styleSheet = document.createElement('style');
styleSheet.textContent = typingStyles;
document.head.appendChild(styleSheet);

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiChatbot = new AIChatbot();
});
