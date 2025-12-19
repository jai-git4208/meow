const https = require('https');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

function listModels(version) {
    console.log(`\n--- Listing Models for API Version: ${version} ---`);
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/${version}/models?key=${API_KEY}`,
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode === 200) {
                const json = JSON.parse(data);
                if (json.models) {
                    json.models.forEach(m => console.log(`Model: ${m.name} (Supported: ${m.supportedGenerationMethods})`));
                } else {
                    console.log("No models found in response.");
                }
            } else {
                console.log(`[Error ${res.statusCode}] ${data}`);
            }
        });
    });

    req.on('error', (e) => { console.error(`Problem with request: ${e.message}`); });
    req.end();
}

listModels('v1');
listModels('v1beta');
