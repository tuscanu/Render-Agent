const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function analyzeProjectRequest(conversationHistory) {
    if (!ai) {
         return "Default Project Request: Please review attached photo to generate an outdoor living space design.";
    }

    const prompt = `
    You are an AI assistant designed to read conversation history between a contractor and a client.
    The contractor specializes in outdoor living spaces, landscaping, hardscaping, pools, pergolas, etc.
    
    Your goal is to extract EXACTLY what the client wants from the chat history.
    Summarize it as a clear project requirement that will be used to generate a 3D architectural render.
    
    Guidelines:
    - Keep it under 2 paragraphs.
    - Highlight specific keywords like "travertine", "modern", "pergola", "fire pit", "pool", etc.
    - If the user did not specify anything but just sent a photo, reply with: "Client sent a photo for design ideas. Generate a beautiful, upgraded outdoor living space design."
    
    Conversation History:
    \`\`\`
    ${conversationHistory}
    \`\`\`
    
    Output the final summary:
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text.trim();
    } catch (error) {
        console.error('Error analyzing conversation with Gemini:', error.message);
        return "Could not analyze the chat history. Please review the photo for a general outdoor design.";
    }
}

module.exports = { analyzeProjectRequest };
