const axios = require('axios');

const GHL_API_KEY = process.env.GHL_API_KEY;

// Fetch Contact Details (Name, Phone, etc)
async function getContact(contactId) {
    if (!GHL_API_KEY) {
        console.warn('⚠️ GHL_API_KEY is missing. Using placeholder contact.');
        return { name: 'Valued Client', phone: '+1234567890' };
    }

    try {
        const response = await axios.get(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Version': '2021-07-28',
                'Accept': 'application/json'
            }
        });
        const data = response.data.contact;
        return {
            name: data.name || data.firstName || 'Valued Client',
            phone: data.phone || 'Unknown Phone',
            email: data.email || 'Unknown Email'
        };
    } catch (error) {
        console.error('Error fetching contact from GHL:', error.message);
        return { name: 'Valued Client', phone: 'Unknown Phone' };
    }
}

// Fetch recent conversation history
async function getConversationHistory(contactId) {
    if (!GHL_API_KEY) {
        return "User: I need a new backyard layout.\nAI: Sure, please send a photo of your yard.";
    }

    try {
        const response = await axios.get(`https://services.leadconnectorhq.com/conversations/search?contactId=${contactId}`, {
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Version': '2021-04-15',
                'Accept': 'application/json'
            }
        });
        
        const conversations = response.data.conversations || [];
        if (conversations.length === 0) return "";
        
        // Grab the first conversation ID
        const conversationId = conversations[0].id;
        
        // Fetch messages for this conversation
        const msgsResponse = await axios.get(`https://services.leadconnectorhq.com/conversations/${conversationId}/messages`, {
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Version': '2021-04-15',
                'Accept': 'application/json'
            }
        });

        const messages = msgsResponse.data.messages || [];
        
        // Format as a text history string
        // We only take the last 10 messages to save token context
        const recentMessages = messages.slice(0, 10).reverse();
        
        let historyString = "";
        for (const msg of recentMessages) {
            const sender = msg.direction === 'inbound' ? 'Client' : 'Agent';
            if (msg.body) {
                historyString += `${sender}: ${msg.body}\n`;
            }
        }
        return historyString;
    } catch (error) {
        console.error('Error fetching conversation from GHL:', error.response?.data || error.message);
        return "";
    }
}

module.exports = { getContact, getConversationHistory };
