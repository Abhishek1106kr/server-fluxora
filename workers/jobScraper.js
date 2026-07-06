import {chromium} from 'playwright';

export async function cleanExtractJobDescription(url){
    const browser=await chromium.launch({headless:true});
    const page=await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle' });

    // TARGETED EXTRACTION: Extract text only from elements where relevant text actually lives
    const rawContent = await page.evaluate(() => {
      // Strips away navigation nodes, scripts, headers, footers, and cookie banners
      const noiseSelectors = 'nav, footer, header, script, style, .cookie-banner, #footer, .menu';
      document.querySelectorAll(noiseSelectors).forEach(el => el.remove());

      // Target the container likely holding the actual core listing details
      const targetContainer = document.querySelector('.job-description, .posting-content, main, article') || document.body;
      return targetContainer.innerText;
    });

    // PRE-PROCESSING CLEANING FILTER: Normalize white-spaces, tabs, and line breaks
    const cleanContent = rawContent
      .replace(/\s+/g, ' ')       // Flattens multiple spaces and tabs into a single space
      .replace(/\n+/g, '\n')      // Reduces massive empty vertical blocks to single line breaks
      .trim();

    return cleanContent;
    } catch (error) {
        console.error("Scrapper layout harvesting dropped:", error);
        return null;
    }finally{
        await browser.close();
    }
} 