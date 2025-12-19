const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testAll() {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelNames = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-001',
        'gemini-1.5-flash-002',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro'
    ];
    const apiVersions = ['v1', 'v1beta'];

    for (const apiVersion of apiVersions) {
        console.log(`\n--- Testing API Version: ${apiVersion} ---`);
        const genAI = new GoogleGenerativeAI(apiKey);

        for (const modelName of modelNames) {
            try {
                // In some SDK versions, apiVersion is passed in the constructor options
                // but for @google/generative-ai, it hit v1beta by default usually.
                // To force v1, we might need a different initialization or just rely on the SDK's behavior.
                // However, let's try getting the model name.

                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion });
                const result = await model.generateContent("hi");
                console.log(`[OK] ${modelName} on ${apiVersion}`);
                return; // Stop if we find one that works
            } catch (e) {
                console.log(`[ERROR] ${modelName} on ${apiVersion}: ${e.message}`);
            }
        }
    }
}

testAll();
