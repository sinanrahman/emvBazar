const puppeteer = require('puppeteer');

/**
 * Generates a PDF from a URL and returns it as a buffer.
 * @param {string} url - The URL to visit.
 * @param {Object} cookies - Authentication cookies if required.
 * @returns {Promise<Buffer>} - The PDF buffer.
 */
exports.generatePDFBuffer = async (url, cookies = {}) => {
    let browser;
    try {
        // Render environment check: Use /usr/bin/google-chrome-stable if it exists (for linux)
        // or let puppeteer use its default if it's installed correctly.
        const options = {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            headless: 'new'
        };

        // If PUPPETEER_EXECUTABLE_PATH is set in environment (highly recommended for Render)
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        browser = await puppeteer.launch(options);
        const page = await browser.newPage();

        // Set cookies if provided (useful for protected routes)
        if (cookies && Object.keys(cookies).length > 0) {
            const domain = new URL(url).hostname;
            for (const [name, value] of Object.entries(cookies)) {
                await page.setCookie({
                    name,
                    value,
                    domain,
                    path: '/'
                });
            }
        }

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        return pdfBuffer;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
