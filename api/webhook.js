const { getContact, getConversationHistory } = require('../utils/ghlApi');
const { sendRenderEmail } = require('../utils/emailNotify');
const { analyzeProjectRequest } = require('../agents/conversationAgent');
const { processImageAndGenerateRender } = require('../agents/renderAgent');

// Vercel Serverless Function format
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    console.log('--- Incoming Webhook ---');
    console.log(JSON.stringify(req.body, null, 2));

    try {
        const body = req.body;
        
        // GHL typical outbound webhook payload format validation
        // Could be { contact_id: "...", attachments: ["url"] }
        // We ensure there is a contact ID and an attachment
        
        const contactId = body.contact_id || body.locationId || 'unknown'; // Graceful fallback
        const attachments = body.attachments || body.Attachments || [];
        const messageBody = body.body || body.Body || '';

        // If no image is attached, ignore it entirely (do not waste AI tokens)
        if (!attachments || attachments.length === 0) {
            console.log('No attachments found in the webhook. Ignoring request.');
            return res.status(200).json({ status: 'ignored', reason: 'no_attachment' });
        }

        const imageUrl = attachments[0];
        console.log(`Processing image for contact ${contactId}: ${imageUrl}`);

        // Acknowledge receipt to GHL immediately to prevent timeout retries
        res.status(200).json({ status: 'Processing started in background' });

        // Run the heavy lifting asynchronously so Vercel doesn't block the initial return
        (async () => {
            try {
                // 1. Get contact data specifically to know where to email and their name
                const contactData = await getContact(contactId);

                // 2. Fetch recent conversation to know what the client actually requested
                const history = await getConversationHistory(contactId);
                
                // 3. Summarize exactly what they want
                const projectDetails = await analyzeProjectRequest(history);
                console.log(`Extracted Request details:\n${projectDetails}`);
                
                // 4. Send photo to standard image pipeline 
                const finalRenderUrl = await processImageAndGenerateRender(imageUrl, projectDetails);
                
                // 5. Fire off email to the owner
                await sendRenderEmail(contactData, projectDetails, imageUrl, finalRenderUrl);
                
                console.log('✅ Fully finished processing for', contactId);
            } catch (asyncErr) {
                console.error(`❌ Background processing failed for ${contactId}:`, asyncErr);
            }
        })();

    } catch (error) {
        console.error('❌ Webhook error:', error);
        // Do not fail 500 back to GHL constantly, just return 200 to clear the queue
        return res.status(200).json({ error: error.message });
    }
}
