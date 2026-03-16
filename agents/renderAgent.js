const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helper to download image to temp storage (required for GenAI file upload if using local files, or we handle base64)
async function fetchImageAsBase64(imageUrl) {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    return buffer.toString('base64');
}

// 1. Analyze the original yard photo to see what is there
async function analyzeYardImage(imageUrl, projectDetails) {
    if (!ai) return "A backyard needing an upgrade.";

    try {
        const base64Image = await fetchImageAsBase64(imageUrl);

        const prompt = `
        You are an expert landscape architect and outdoor designer.
        Look at this photo of a client's yard.
        
        The client expects the following design: 
        "${projectDetails}"
        
        Please generate a single, highly detailed, comma-separated positive prompt that can be fed directly to an AI Image Generator (like Stable Diffusion/Midjourney) to transform this exact yard into the client's dream space. 
        Focus heavily on photorealism, architectural lighting, professional landscape photography, 8k resolution, and incorporating exactly what the client requested while respecting the geometry of the current yard.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                { inlineData: { data: base64Image, mimeType: 'image/jpeg' } }
            ]
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error analyzing yard with Gemini:', error.message);
        return "photorealistic, architectural rendering, outdoor living space, beautiful backyard, 8k, professional photography";
    }
}

// 2. Mock call to "Nano Banana Pro" API (replace with real endpoint if available)
async function generateNanoBananaRenders(imageUrl, renderPrompt) {
    console.log(`Calling Nano Banana API with prompt: "${renderPrompt}" for image: ${imageUrl}`);
    
    // As Nano Banana Pro is a system we are mocking based on the request, we return 4 placeholder URLs for evaluation.
    // In a real scenario, this would be: 
    // const response = await axios.post('NANO_BANANA_URL', { image: imageUrl, prompt: renderPrompt, n: 4 });
    // return response.data.images;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return [
        "https://images.unsplash.com/photo-1560067160-c3d3eedbcbd6?auto=format&fit=crop&q=80&w=1000",
        "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&q=80&w=1000",
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000",
        "https://images.unsplash.com/photo-1510694038896-bc95147321eb?auto=format&fit=crop&q=80&w=1000"
    ];
}

// 3. Gemini evaluates the 4 renders and picks the best one
async function evaluateAndSelectBestRender(renderUrls, projectDetails) {
    if (!ai || renderUrls.length === 0) return renderUrls[0];
    
    console.log(`Evaluating ${renderUrls.length} renders to find the best match...`);

    try {
        // Prepare images for Gemini
        const parts = [
            `You are the top landscape architect lead at a contractor agency.
            You have generated 4 potential architectural renders for a client based on this request:
            "${projectDetails}"
            
            Look at the following 4 images (numbered 1 to 4 in order).
            Which one looks the most photorealistic, structurally sound, and best matches the client request?
            
            REPLY ONLY WITH THE NUMBER of the best image: 1, 2, 3, or 4.
            DO NOT output any other text.`
        ];

        for (let i = 0; i < renderUrls.length; i++) {
            const base64 = await fetchImageAsBase64(renderUrls[i]);
            parts.push(`Image ${i + 1}:`);
            parts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: parts
        });

        const reply = response.text.trim();
        const selectedIndex = parseInt(reply) - 1;

        if (selectedIndex >= 0 && selectedIndex < renderUrls.length) {
            console.log(`✅ Gemini selected Render #${selectedIndex + 1} as the best.`);
            return renderUrls[selectedIndex];
        } else {
            console.warn(`Could not parse index from Gemini: "${reply}". Defaulting to #1.`);
            return renderUrls[0];
        }
    } catch (error) {
        console.error('Error evaluating renders:', error.message);
        return renderUrls[0];
    }
}

// Master function
async function processImageAndGenerateRender(imageUrl, projectDetails) {
    console.log('1. Analyzing original yard image...');
    const optimizedPrompt = await analyzeYardImage(imageUrl, projectDetails);
    
    console.log('2. Generating 4 potential designs...');
    const renders = await generateNanoBananaRenders(imageUrl, optimizedPrompt);
    
    console.log('3. Selecting best design...');
    const bestRenderUrl = await evaluateAndSelectBestRender(renders, projectDetails);
    
    return bestRenderUrl;
}

module.exports = { processImageAndGenerateRender };
